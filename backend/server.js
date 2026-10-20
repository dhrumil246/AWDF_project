require('dotenv').config({ quiet: true });
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
  .then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
  .catch((err) => {
    console.error(`Failed to start: ${err.message}`);
    process.exit(1);
  });
