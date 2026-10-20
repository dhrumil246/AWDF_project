const express = require('express');
const cors = require('cors');
const logger = require('./middleware/logger');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const authRouter = require('./routes/auth');
const carsRouter = require('./routes/cars');

const app = express();

// Allow the React dev server (or the origins listed in CLIENT_URL) to call the API.
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((o) => o.trim());

// Middleware pipeline: CORS → body parsing → logging → routes → 404 → error handler (last)
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use(logger);

app.get('/', (req, res) => res.json({ message: 'Car Details API is running' }));
app.use('/auth', authRouter);
app.use('/cars', carsRouter);

// Demo route to show the global error handler catching a thrown error.
if (process.env.NODE_ENV !== 'production') {
  app.get('/debug/error', () => {
    throw new Error('Deliberate test error');
  });
}

app.use(notFound);
app.use(errorHandler);

module.exports = app;
