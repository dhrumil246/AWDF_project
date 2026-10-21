const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const logger = require('./middleware/logger');
const notFound = require('./middleware/notFound');
const sanitize = require('./middleware/sanitize');
const errorHandler = require('./middleware/errorHandler');
const authRouter = require('./routes/auth');
const carsRouter = require('./routes/cars');
const aiRouter = require('./routes/ai');
const { cache } = require('./cache');
const { rootLinks } = require('./links');

// Second NoSQL-injection layer: Mongoose wraps any $-operator found in a
// query filter value in $eq, so it is matched literally.
mongoose.set('sanitizeFilter', true);

const app = express();

// Allow the React dev server (or the origins listed in CLIENT_URL) to call the API.
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((o) => o.trim());

// Middleware pipeline: CORS → body parsing → sanitize → logging → routes → 404 → error handler (last)
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use(sanitize);
app.use(logger);

app.get('/', (req, res) => res.json({ message: 'Car Details API is running', _links: rootLinks }));

// Health check for load balancers / blue-green switching: which version and
// colour is answering, and whether the database connection is up.
const { version } = require('./package.json');
app.get('/health', (req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({
    status: dbUp ? 'ok' : 'degraded',
    version: process.env.APP_VERSION || version,
    color: process.env.APP_COLOR || null,
    uptimeSeconds: Math.round(process.uptime()),
  });
});
app.use('/auth', authRouter);
app.use('/cars', carsRouter);
app.use('/api/ai', aiRouter);

// Demo route to show the global error handler catching a thrown error.
if (process.env.NODE_ENV !== 'production') {
  app.get('/debug/error', () => {
    throw new Error('Deliberate test error');
  });

  // Cache hit/miss counters and current keys.
  app.get('/debug/cache', (req, res) => res.json({ stats: cache.getStats(), keys: cache.keys() }));
}

app.use(notFound);
app.use(errorHandler);

module.exports = app;
