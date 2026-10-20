const express = require('express');
const auth = require('../middleware/auth');
const requireJson = require('../middleware/requireJson');
const rateLimit = require('../middleware/rateLimit');
const { validateDescriptionRequest } = require('../middleware/validate');
const { generateCarDescription } = require('../services/ai');

const router = express.Router();

const AI_RATE_LIMIT_MS = Number(process.env.AI_RATE_LIMIT_MS ?? 10000);

// POST /api/ai/generate-description { make, model, year?, fuelType?, transmission? }
router.post('/generate-description', auth, requireJson, validateDescriptionRequest, rateLimit(AI_RATE_LIMIT_MS), async (req, res) => {
  const { make, model, year, fuelType, transmission } = req.body;

  try {
    const description = await generateCarDescription({ make, model, year, fuelType, transmission });
    res.status(200).json({ description, fallback: false });
  } catch (err) {
    // Graceful degradation: the AI is optional. Log the real reason on the
    // server, tell the client to carry on without it.
    console.error(`[AI] description failed: ${err.message}`);
    res.status(200).json({
      description: '',
      fallback: true,
      message: 'AI suggestion is unavailable right now. You can write the description yourself.',
    });
  }
});

module.exports = router;
