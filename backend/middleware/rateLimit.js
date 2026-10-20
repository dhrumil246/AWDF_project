// Simple per-user rate limit kept in memory: at most one request every
// `windowMs` per logged-in user. Limits cost and quota use of the AI API.
function rateLimit(windowMs) {
  const lastCall = new Map(); // userId -> timestamp of last allowed request

  return (req, res, next) => {
    const now = Date.now();
    const previous = lastCall.get(req.user.id) || 0;
    const waitMs = previous + windowMs - now;

    if (waitMs > 0) {
      const seconds = Math.ceil(waitMs / 1000);
      res.set('Retry-After', String(seconds));
      return res.status(429).json({ error: `Please wait ${seconds}s before asking the AI again` });
    }

    lastCall.set(req.user.id, now);
    next();
  };
}

module.exports = rateLimit;
