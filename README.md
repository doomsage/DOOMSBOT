# DOOMSBOT – JEE AI MENTOR

This app uses a **server-side Gemini proxy** so your API key stays fixed on server and is not exposed in browser code.

## Setup

1. Create `.env` from `.env.example` and set your key:
   ```bash
   GEMINI_API_KEY=YOUR_REAL_GEMINI_KEY
   PORT=3000
   ```
2. Start server:
   ```bash
   npm start
   ```
3. Open:
   - `http://localhost:3000`

## Important Deployment Note

- This app **requires Node backend (`server.js`)**.
- If you deploy only static files (just HTML/CSS/JS), chat requests will fail with **404 on `/api/chat`**.

## Notes

- Frontend calls `/api/chat` only.
- Gemini API key is read from `GEMINI_API_KEY` environment variable in `server.js`.
- Do not commit `.env`.
