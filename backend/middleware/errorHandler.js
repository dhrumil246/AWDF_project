// Global error handler: must be registered last. Express recognises it by
// its four arguments. The stack trace is logged on the server only.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(err.stack);

  // Malformed JSON body from express.json()
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }

  res.status(500).json({ error: 'Something went wrong' });
}

module.exports = errorHandler;
