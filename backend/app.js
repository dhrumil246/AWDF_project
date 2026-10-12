const express = require('express');
const logger = require('./middleware/logger');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const carsRouter = require('./routes/cars');

const app = express();

// Middleware pipeline: body parsing → logging → routes → 404 → error handler (last)
app.use(express.json());
app.use(logger);

app.get('/', (req, res) => res.json({ message: 'Car Details API is running' }));
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
