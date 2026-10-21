// Assignment 7 — ask Gemini for UI design suggestions for the frontend.
//   cd backend && npm run ai:design
// Sends the current design tokens (frontend/src/index.css), the list of UI
// components and two screenshots of the real app, and saves Gemini's answer
// unedited to assignments/evidence/a7-gemini-suggestions.{json,md}.
// Needs GEMINI_API_KEY in backend/.env. No user data is sent — only the
// stylesheet and screenshots of the demo inventory.
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const EVIDENCE = path.join(ROOT, 'assignments', 'evidence');
const MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const image = (p) => ({ inlineData: { mimeType: 'image/jpeg', data: fs.readFileSync(path.join(ROOT, p)).toString('base64') } });

const PROMPT = `You are a senior UI/UX designer reviewing a React web app.

App: "Car Details Management System" — a dealership inventory tool. Users log in, browse car cards
(make/model, price in INR, status badge available/sold, owner), add and edit cars in a form with a
live preview, and can ask an AI for a car description. Screenshot 1 is the car list, screenshot 2 the
Add Car form.

All colours come from CSS custom properties in index.css (below). Components use these classes:
header, navbar, card, badge-available, badge-sold, price, specs, action, button, notice, form.

index.css:
${read('frontend/src/index.css')}

App.css:
${read('frontend/src/App.css')}

Give exactly 5 concrete, implementable suggestions to improve visual hierarchy, accessibility
(WCAG 2.1 AA contrast, focus visibility, touch targets) and consistency. Prefer changes that can be
made through CSS custom properties. For each give: a short title, the problem you see (point to the
screenshot or the CSS), the exact change (CSS variables and/or rules), why it helps, and any
accessibility impact. Do not invent features the app does not have.

Respond only with JSON in this shape:
{"suggestions":[{"title":"","problem":"","change":"","css":"","rationale":"","accessibility":""}]}`;

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY is not set in backend/.env');
    process.exit(1);
  }

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: PROMPT },
            image('assignments/evidence/a7-before-cars.jpg'),
            image('assignments/evidence/a7-before-add.jpg'),
          ],
        },
      ],
      generationConfig: { temperature: 0.4, responseMimeType: 'application/json' },
    }),
    signal: AbortSignal.timeout(60000),
  });

  const body = await res.json();
  if (!res.ok) {
    console.error(`Gemini responded ${res.status}: ${body?.error?.message}`);
    process.exit(1);
  }

  const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  const { suggestions } = JSON.parse(text);

  fs.writeFileSync(
    path.join(EVIDENCE, 'a7-gemini-suggestions.json'),
    JSON.stringify({ model: MODEL, requestedAt: new Date().toISOString(), prompt: PROMPT, response: suggestions }, null, 2),
  );

  const md = [
    `# Gemini UI suggestions (unedited)`,
    ``,
    `Model: \`${body.modelVersion || MODEL}\` · requested ${new Date().toISOString()}`,
    ``,
    ...suggestions.flatMap((s, i) => [
      `## ${i + 1}. ${s.title}`,
      `**Problem:** ${s.problem}`,
      ``,
      `**Change:** ${s.change}`,
      ``,
      s.css ? '```css\n' + s.css + '\n```' : '',
      `**Why:** ${s.rationale}`,
      ``,
      `**Accessibility:** ${s.accessibility}`,
      ``,
    ]),
  ].join('\n');
  fs.writeFileSync(path.join(EVIDENCE, 'a7-gemini-suggestions.md'), md);

  console.log(`Saved ${suggestions.length} suggestions to assignments/evidence/a7-gemini-suggestions.md`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
