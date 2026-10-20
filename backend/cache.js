const NodeCache = require('node-cache');

// Process-local, in-memory cache. Entries expire after 60 s (stdTTL).
// useClones: false — we only store plain JSON and never mutate it, so there
// is no need to deep-copy on every get/set.
const cache = new NodeCache({ stdTTL: 60, checkperiod: 120, useClones: false });

const keys = {
  allCars: 'cars:all',
  car: (id) => `car:${id}`,
};

// DISABLE_CACHE=true turns caching off, used to measure uncached response times.
const isEnabled = () => process.env.DISABLE_CACHE !== 'true';

module.exports = { cache, keys, isEnabled };
