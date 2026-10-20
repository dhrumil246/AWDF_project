// Route-specific middleware: the :id must be a 24-character hex MongoDB ObjectId.
function validateId(req, res, next) {
  if (!/^[0-9a-f]{24}$/i.test(req.params.id)) {
    return res.status(400).json({ error: `Invalid car id: ${req.params.id}` });
  }
  next();
}

module.exports = validateId;
