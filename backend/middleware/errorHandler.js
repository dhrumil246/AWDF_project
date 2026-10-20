// Global error handler: must be registered last. Express recognises it by
// its four arguments. Full details are logged on the server only; the client
// gets a clean, structured JSON message.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Malformed JSON body from express.json()
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }

  // Mongoose schema validation failed: return each field's message.
  if (err.name === 'ValidationError') {
    const details = Object.fromEntries(
      Object.entries(err.errors).map(([field, e]) => [
        field,
        e.name === 'CastError' ? `${field} must be a ${e.kind.toLowerCase()}` : e.message,
      ]),
    );
    return res.status(400).json({ error: 'Validation failed', details });
  }

  // A value could not be cast to the schema type, e.g. year: "abc".
  if (err.name === 'CastError') {
    return res.status(400).json({ error: `Invalid value for ${err.path}` });
  }

  // Unique index violation (duplicate registrationNumber).
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({ error: `A car with this ${field} already exists` });
  }

  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong' });
}

module.exports = errorHandler;
