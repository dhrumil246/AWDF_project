require('dotenv').config({ quiet: true });
const fs = require('fs');
const https = require('https');
const app = require('./app');
const connectDB = require('./config/db');
require('./events/listeners'); // register background event handlers once

const PORT = process.env.PORT || 5000;

if (!process.env.GEMINI_API_KEY) {
  console.warn('GEMINI_API_KEY is not set: AI descriptions will fall back to manual entry.');
}

if (!process.env.JWT_SECRET) {
  console.error('Failed to start: JWT_SECRET is not set. Add it to .env (see .env.example).');
  process.exit(1);
}

connectDB(process.env.MONGO_URI)
  .then(() => {
    // HTTPS when a certificate is configured (e.g. made with mkcert), else HTTP.
    const { HTTPS_KEY_FILE, HTTPS_CERT_FILE } = process.env;
    if (HTTPS_KEY_FILE && HTTPS_CERT_FILE) {
      const tls = { key: fs.readFileSync(HTTPS_KEY_FILE), cert: fs.readFileSync(HTTPS_CERT_FILE) };
      https.createServer(tls, app).listen(PORT, () => console.log(`Server running on https://localhost:${PORT}`));
    } else {
      app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    }
  })
  .catch((err) => {
    console.error(`Failed to start: ${err.message}`);
    process.exit(1);
  });
