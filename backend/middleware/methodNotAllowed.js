// For a URL that exists but does not support the request method: 405 with an
// Allow header listing the methods that do work (instead of a misleading 404).
const methodNotAllowed = (allowed) => (req, res) => {
  res.set('Allow', allowed.join(', '));
  res.status(405).json({ error: `Method ${req.method} not allowed on ${req.originalUrl}`, allowed });
};

module.exports = methodNotAllowed;
