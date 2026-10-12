// Logs method, URL and timestamp for every request.
function logger(req, res, next) {
  console.log(`${req.method} ${req.originalUrl} - ${new Date().toISOString()}`);
  next();
}

module.exports = logger;
