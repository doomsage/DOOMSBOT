# DOOMSBOT – JEE AI MENTOR

This app now uses a **server-side Gemini proxy** so your API key stays fixed on server and is not exposed in browser code.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env` from `.env.example` and set your key:
   ```bash
   GEMINI_API_KEY=YOUR_REAL_GEMINI_KEY
   PORT=3000
   ```
3. Start server:
   ```bash
   npm start
   ```
4. Open:
   - `http://localhost:3000`

## Notes

- Frontend calls `/api/chat` only.
- Gemini API key is read from `GEMINI_API_KEY` environment variable in `server.js`.
- Do not commit `.env`.
