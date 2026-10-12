// Route-specific middleware: the :id must be a positive integer.
function validateId(req, res, next) {
  if (!/^[1-9]\d*$/.test(req.params.id)) {
    return res.status(400).json({ error: `Invalid car id: ${req.params.id}` });
  }
  next();
}

module.exports = validateId;
