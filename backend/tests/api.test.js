// API tests: npm test (Node's built-in test runner + supertest).
// Each test starts with an empty in-memory MongoDB and an empty cache.
const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// CI passes secrets.JWT_SECRET; locally a random one is fine for tests.
process.env.JWT_SECRET ||= crypto.randomBytes(32).toString('hex');

const app = require('../app');
const { cache } = require('../cache');

let mongo;

before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  // Wait until the unique indexes (email, registrationNumber) exist.
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
});

after(async () => {
  await mongoose.disconnect();
  await mongo.stop();
  cache.close(); // stop node-cache's expiry timer so the test process can exit
});

// Empty every collection but keep it (and its unique indexes). dropDatabase()
// would also drop the indexes, and duplicate emails would then be accepted.
beforeEach(async () => {
  await Promise.all(Object.values(mongoose.models).map((model) => model.deleteMany({})));
  cache.flushAll();
});

const kia = { make: 'Kia', model: 'Seltos', year: 2024, price: 1350000 };

async function registerUser(name = 'Demo Dealer', email = 'demo@cars.test') {
  const res = await request(app).post('/auth/register').send({ name, email, password: 'demo12345' });
  assert.equal(res.status, 201);
  return res.body.token;
}

describe('general', () => {
  it('GET / returns 200', async () => {
    const res = await request(app).get('/');
    assert.equal(res.status, 200);
  });

  it('unknown routes return a JSON 404', async () => {
    const res = await request(app).get('/does-not-exist');
    assert.equal(res.status, 404);
    assert.match(res.body.error, /not found/);
  });
});

describe('auth', () => {
  it('register returns a token and never the password', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'Ravi', email: 'Ravi@Example.com', password: 'secret123' });
    assert.equal(res.status, 201);
    assert.ok(res.body.token);
    assert.equal(res.body.user.email, 'ravi@example.com');
    assert.equal(res.body.user.password, undefined);
  });

  it('rejects a duplicate email with 409', async () => {
    await registerUser();
    const res = await request(app).post('/auth/register').send({ name: 'X', email: 'demo@cars.test', password: 'demo12345' });
    assert.equal(res.status, 409);
  });

  it('rejects a wrong password with 401', async () => {
    await registerUser();
    const res = await request(app).post('/auth/login').send({ email: 'demo@cars.test', password: 'wrong-pass' });
    assert.equal(res.status, 401);
  });

  it('GET /auth/me returns the logged-in user', async () => {
    const token = await registerUser();
    const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.email, 'demo@cars.test');
  });
});

describe('cars', () => {
  it('GET /cars without a token returns 401', async () => {
    const res = await request(app).get('/cars');
    assert.equal(res.status, 401);
  });

  it('GET /cars with an invalid token returns 401', async () => {
    const res = await request(app).get('/cars').set('Authorization', 'Bearer not.a.token');
    assert.equal(res.status, 401);
  });

  it('GET /cars with a token returns 200 and an empty list', async () => {
    const token = await registerUser();
    const res = await request(app).get('/cars').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, []);
  });

  it('POST /cars with missing fields returns 400 with details', async () => {
    const token = await registerUser();
    const res = await request(app).post('/cars').set('Authorization', `Bearer ${token}`).send({ make: 'Kia' });
    assert.equal(res.status, 400);
    assert.ok(res.body.details.model);
    assert.ok(res.body.details.year);
    assert.ok(res.body.details.price);
  });

  it('POST /cars creates a car that GET /cars then returns', async () => {
    const token = await registerUser();
    const created = await request(app).post('/cars').set('Authorization', `Bearer ${token}`).send(kia);
    assert.equal(created.status, 201);
    assert.equal(created.headers.location, `/cars/${created.body.id}`);
    assert.equal(created.body.status, 'available'); // schema default

    const list = await request(app).get('/cars').set('Authorization', `Bearer ${token}`);
    assert.equal(list.body.length, 1);
    assert.equal(list.body[0].model, 'Seltos');
  });

  it('caches GET /cars and invalidates the cache on write', async () => {
    const token = await registerUser();
    const auth = { Authorization: `Bearer ${token}` };

    assert.equal((await request(app).get('/cars').set(auth)).headers['x-cache'], 'MISS');
    assert.equal((await request(app).get('/cars').set(auth)).headers['x-cache'], 'HIT');

    await request(app).post('/cars').set(auth).send(kia);
    const afterWrite = await request(app).get('/cars').set(auth);
    assert.equal(afterWrite.headers['x-cache'], 'MISS');
    assert.equal(afterWrite.body.length, 1);
  });

  it('only the owner can update or delete a car (403 for others)', async () => {
    const ownerToken = await registerUser('Owner', 'owner@cars.test');
    const otherToken = await registerUser('Other', 'other@cars.test');
    const { body: car } = await request(app).post('/cars').set('Authorization', `Bearer ${ownerToken}`).send(kia);

    const put = await request(app).put(`/cars/${car.id}`).set('Authorization', `Bearer ${otherToken}`).send({ price: 1 });
    assert.equal(put.status, 403);
    const del = await request(app).delete(`/cars/${car.id}`).set('Authorization', `Bearer ${otherToken}`);
    assert.equal(del.status, 403);

    const ownPut = await request(app)
      .put(`/cars/${car.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ price: 1299000 });
    assert.equal(ownPut.status, 200);
    assert.equal(ownPut.body.price, 1299000);
  });

  it('DELETE /cars/:id removes the car', async () => {
    const token = await registerUser();
    const auth = { Authorization: `Bearer ${token}` };
    const { body: car } = await request(app).post('/cars').set(auth).send(kia);

    assert.equal((await request(app).delete(`/cars/${car.id}`).set(auth)).status, 200);
    assert.equal((await request(app).get(`/cars/${car.id}`).set(auth)).status, 404);
  });

  it('GET /cars/:id with a malformed id returns 400', async () => {
    const token = await registerUser();
    const res = await request(app).get('/cars/123').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 400);
  });
});
