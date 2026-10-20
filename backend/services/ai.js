// Gemini integration. The API key stays on the server and is read from .env.
// Uses Node's built-in fetch against the Gemini REST API (no SDK needed).
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// Prompt engineering: a fixed instruction that keeps answers short, factual
// and limited to the details we send, so the model does not invent mileage,
// owners or condition.
const SYSTEM_INSTRUCTION = [
  'You write short listing descriptions for a used-car dealership in India.',
  'Write 2 or 3 sentences, at most 60 words, in plain text without markdown or emojis.',
  'Use only the details provided. Do not invent mileage, number of owners, condition, features or prices.',
  'Use a friendly, professional tone.',
].join(' ');

// Only non-personal car details are sent to the third-party model: never the
// user's name or email, and not the registration number (it identifies a
// real vehicle and its owner).
function buildPrompt({ make, model, year, fuelType, transmission }) {
  const details = [
    `Make: ${make}`,
    `Model: ${model}`,
    year && `Year: ${year}`,
    fuelType && `Fuel type: ${fuelType}`,
    transmission && `Transmission: ${transmission}`,
  ].filter(Boolean);
  return `Write a listing description for this car.\n${details.join('\n')}`;
}

async function generateCarDescription(car) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  const timeoutMs = Number(process.env.AI_TIMEOUT_MS || 10000);

  const res = await fetch(`${GEMINI_URL}/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents: [{ role: 'user', parts: [{ text: buildPrompt(car) }] }],
      generationConfig: { temperature: 0.7 },
    }),
    signal: AbortSignal.timeout(timeoutMs), // give up instead of hanging
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(`Gemini responded ${res.status}: ${body?.error?.message || res.statusText}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts
    ?.map((p) => p.text || '')
    .join('')
    .trim();
  if (!text) throw new Error('Gemini returned no text');

  return text.slice(0, 500); // the Car schema allows 500 characters
}

module.exports = { generateCarDescription, buildPrompt };
