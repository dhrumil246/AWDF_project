const { sanitize: stripOperators } = require('express-mongo-sanitize');

// NoSQL-injection protection: removes keys that start with "$" or contain "."
// from the request body and route params, so a value like
// { "email": { "$gt": "" } } can never become a MongoDB query operator.
//
// express-mongo-sanitize's own middleware (app.use(mongoSanitize())) crashes on
// Express 5, where req.query is a read-only getter, so only its sanitize()
// function is used here. This API reads no query-string parameters.
function sanitize(req, res, next) {
  if (req.body) req.body = stripOperators(req.body);
  if (req.params) req.params = stripOperators(req.params);
  next();
}

module.exports = sanitize;
