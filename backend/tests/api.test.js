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

  it('GET /health reports status and version', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.ok(res.body.version);
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

    const patch = await request(app).patch(`/cars/${car.id}`).set('Authorization', `Bearer ${otherToken}`).send({ price: 1 });
    assert.equal(patch.status, 403);
    const del = await request(app).delete(`/cars/${car.id}`).set('Authorization', `Bearer ${otherToken}`);
    assert.equal(del.status, 403);

    const ownPatch = await request(app)
      .patch(`/cars/${car.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ price: 1299000 });
    assert.equal(ownPatch.status, 200);
    assert.equal(ownPatch.body.price, 1299000);
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

describe('REST maturity (Assignment 1)', () => {
  it('returns 405 with an Allow header for an unsupported method on an existing URL', async () => {
    const token = await registerUser();
    const auth = { Authorization: `Bearer ${token}` };
    const { body: car } = await request(app).post('/cars').set(auth).send(kia);

    const onCollection = await request(app).delete('/cars').set(auth);
    assert.equal(onCollection.status, 405);
    assert.equal(onCollection.headers.allow, 'GET, POST');

    const onCar = await request(app).post(`/cars/${car.id}`).set(auth).send({});
    assert.equal(onCar.status, 405);
    assert.equal(onCar.headers.allow, 'GET, PUT, PATCH, DELETE');

    const onLogin = await request(app).get('/auth/login');
    assert.equal(onLogin.status, 405);
    assert.equal(onLogin.headers.allow, 'POST');
  });

  it('PATCH updates only the fields sent; PUT requires the full car', async () => {
    const token = await registerUser();
    const auth = { Authorization: `Bearer ${token}` };
    const { body: car } = await request(app).post('/cars').set(auth).send(kia);

    const patch = await request(app).patch(`/cars/${car.id}`).set(auth).send({ status: 'sold' });
    assert.equal(patch.status, 200);
    assert.equal(patch.body.status, 'sold');
    assert.equal(patch.body.model, 'Seltos');

    const partialPut = await request(app).put(`/cars/${car.id}`).set(auth).send({ price: 1 });
    assert.equal(partialPut.status, 400);

    const fullPut = await request(app).put(`/cars/${car.id}`).set(auth).send({ ...kia, price: 1299000 });
    assert.equal(fullPut.status, 200);
    assert.equal(fullPut.body.price, 1299000);
  });

  it('includes hypermedia links that depend on ownership and state', async () => {
    const ownerToken = await registerUser('Owner', 'owner@cars.test');
    const otherToken = await registerUser('Other', 'other@cars.test');
    const { body: created } = await request(app).post('/cars').set('Authorization', `Bearer ${ownerToken}`).send(kia);
    assert.equal(created._links.self.href, `/cars/${created.id}`);

    const asOwner = await request(app).get(`/cars/${created.id}`).set('Authorization', `Bearer ${ownerToken}`);
    assert.deepEqual(Object.keys(asOwner.body._links).sort(), ['collection', 'delete', 'markSold', 'replace', 'self', 'update']);
    assert.deepEqual(asOwner.body._links.markSold.body, { status: 'sold' });

    const asOther = await request(app).get(`/cars/${created.id}`).set('Authorization', `Bearer ${otherToken}`);
    assert.deepEqual(Object.keys(asOther.body._links).sort(), ['collection', 'self']);

    const sold = await request(app).patch(`/cars/${created.id}`).set('Authorization', `Bearer ${ownerToken}`).send({ status: 'sold' });
    assert.ok(sold.body._links.markAvailable);
    assert.equal(sold.body._links.markSold, undefined);
  });

  it('GET / lists the API entry points', async () => {
    const res = await request(app).get('/');
    assert.equal(res.body._links.login.href, '/auth/login');
    assert.equal(res.body._links.cars.href, '/cars');
  });
});

describe('security (Assignment 2)', () => {
  const User = () => mongoose.model('User');

  it('rejects a NoSQL-injection login payload', async () => {
    await registerUser();
    const res = await request(app)
      .post('/auth/login')
      .send({ email: { $gt: '' }, password: { $gt: '' } });
    assert.equal(res.status, 400);
    assert.equal(res.body.token, undefined);
  });

  it('strips $-operator and dotted keys from request bodies', async () => {
    const token = await registerUser();
    const res = await request(app)
      .post('/cars')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...kia, $where: 'sleep(5000)', 'owner.id': 'x', price: { $gt: 0 } });
    // the operator is removed (price becomes {}), so validation rejects it: no query runs
    assert.equal(res.status, 400);
    assert.match(res.body.details.price, /price must be a number/);
    assert.equal(await mongoose.model('Car').countDocuments(), 0);
  });

  it('an operator in a raw query matches any user unless sanitizeFilter is on', async () => {
    await registerUser();
    mongoose.set('sanitizeFilter', false);
    const unprotected = await User().findOne({ email: { $gt: '' } });
    mongoose.set('sanitizeFilter', true);

    assert.ok(unprotected, 'without protection { $gt: "" } matches the first user');
    // with sanitizeFilter the operator is wrapped in $eq and the query is refused
    await assert.rejects(User().findOne({ email: { $gt: '' } }), { name: 'CastError' });
  });

  it('never returns password hashes', async () => {
    const token = await registerUser();
    const me = await request(app).get('/auth/me').set('Authorization', `Bearer ${token}`);
    assert.equal(me.body.password, undefined);
    const stored = await User().findOne({ email: 'demo@cars.test' }).select('+password');
    assert.match(stored.password, /^\$2[aby]\$10\$/); // bcrypt hash, cost 10
  });
});

describe('ai descriptions', () => {
  const realFetch = globalThis.fetch;
  const body = { make: 'Kia', model: 'Seltos', year: 2024, fuelType: 'Petrol', registrationNumber: 'GJ01KZ4321' };

  // Replace fetch with a fake Gemini; records what the server sent.
  function fakeGemini(response) {
    const calls = [];
    globalThis.fetch = async (url, options) => {
      calls.push({ url, options });
      if (response instanceof Error) throw response;
      return new Response(JSON.stringify(response.json), { status: response.status });
    };
    return calls;
  }

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-key';
  });

  after(() => {
    globalThis.fetch = realFetch;
    delete process.env.GEMINI_API_KEY;
  });

  const post = (token, payload = body) =>
    request(app).post('/api/ai/generate-description').set('Authorization', `Bearer ${token}`).send(payload);

  it('requires a token', async () => {
    const res = await request(app).post('/api/ai/generate-description').send(body);
    assert.equal(res.status, 401);
  });

  it('rejects a request without a model with 400', async () => {
    const token = await registerUser();
    const res = await post(token, { make: 'Kia' });
    assert.equal(res.status, 400);
  });

  it('returns the generated description and sends no personal data to Gemini', async () => {
    const calls = fakeGemini({
      status: 200,
      json: { candidates: [{ content: { parts: [{ text: 'A compact SUV with a refined petrol engine.' }] } }] },
    });
    const token = await registerUser('Demo Dealer', 'demo@cars.test');
    const res = await post(token);

    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { description: 'A compact SUV with a refined petrol engine.', fallback: false });

    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /:generateContent$/);
    assert.equal(calls[0].options.headers['x-goog-api-key'], 'test-key'); // key in a header, not the URL
    const sent = calls[0].options.body;
    assert.match(sent, /Kia/);
    assert.doesNotMatch(sent, /GJ01KZ4321/); // registration number is not shared
    assert.doesNotMatch(sent, /demo@cars\.test|Demo Dealer/); // nor the user's identity
  });

  it('falls back gracefully when Gemini fails', async () => {
    fakeGemini({ status: 500, json: { error: { message: 'internal' } } });
    const token = await registerUser();
    const res = await post(token);
    assert.equal(res.status, 200);
    assert.equal(res.body.fallback, true);
    assert.equal(res.body.description, '');
  });

  it('falls back gracefully on a network error or timeout', async () => {
    fakeGemini(new DOMException('The operation was aborted due to timeout', 'TimeoutError'));
    const token = await registerUser();
    const res = await post(token);
    assert.equal(res.status, 200);
    assert.equal(res.body.fallback, true);
  });

  it('falls back gracefully when no API key is configured', async () => {
    delete process.env.GEMINI_API_KEY;
    const calls = fakeGemini({ status: 200, json: {} });
    const token = await registerUser();
    const res = await post(token);
    assert.equal(res.body.fallback, true);
    assert.equal(calls.length, 0); // never calls Gemini without a key
  });

  it('rate-limits a second request from the same user with 429', async () => {
    fakeGemini({ status: 200, json: { candidates: [{ content: { parts: [{ text: 'ok' }] } }] } });
    const token = await registerUser();
    assert.equal((await post(token)).status, 200);
    const second = await post(token);
    assert.equal(second.status, 429);
    assert.ok(second.headers['retry-after']);
  });
});
