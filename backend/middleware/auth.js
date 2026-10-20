const jwt = require('jsonwebtoken');

// Verifies "Authorization: Bearer <token>" and sets req.user = { id, email, name }.
function auth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const { id, email, name } = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id, email, name };
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Token expired, please log in again' : 'Invalid token';
    res.status(401).json({ error: message });
  }
}

module.exports = auth;
