const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = Number(process.env.PORT || 3000);
const API_KEY = process.env.GEMINI_API_KEY || '';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const PREFERRED_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
  'gemini-1.5-pro-latest'
];

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function serveStaticFile(reqPath, res) {
  const safePath = reqPath === '/' ? '/index.html' : reqPath;
  const fullPath = path.join(__dirname, safePath);

  if (!fullPath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      fs.readFile(path.join(__dirname, 'index.html'), (indexErr, indexData) => {
        if (indexErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Not Found');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(indexData);
      });
      return;
    }

    const ext = path.extname(fullPath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';

    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });

    req.on('error', reject);
  });
}

function rankModels(available) {
  const set = new Set(available);
  const ranked = PREFERRED_MODELS.filter((name) => set.has(name));
  for (const name of available) {
    if (!ranked.includes(name) && name.includes('gemini')) ranked.push(name);
  }
  return ranked.length ? ranked : [...PREFERRED_MODELS];
}

async function proxyGemini({ contents, systemInstruction, generationConfig }) {
  const modelsResponse = await fetch(`${API_BASE}/models?key=${API_KEY}`);
  const modelsJson = await modelsResponse.json().catch(() => ({}));

  let modelNames = [...PREFERRED_MODELS];
  if (modelsResponse.ok && Array.isArray(modelsJson.models)) {
    const supported = modelsJson.models
      .filter((model) => Array.isArray(model.supportedGenerationMethods) && model.supportedGenerationMethods.includes('generateContent'))
      .map((model) => model.name.replace('models/', ''));

    modelNames = rankModels(supported);
  }

  const errors = [];
  for (const modelName of modelNames) {
    const response = await fetch(`${API_BASE}/models/${modelName}:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, systemInstruction, generationConfig })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      errors.push(`${modelName}: ${data?.error?.message || `HTTP ${response.status}`}`);
      continue;
    }

    return { ok: true, data };
  }

  return { ok: false, error: errors.join(' | ') || 'All Gemini models failed.' };
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'POST' && parsedUrl.pathname === '/api/chat') {
    if (!API_KEY) {
      sendJson(res, 500, { error: 'Server missing GEMINI_API_KEY.' });
      return;
    }

    try {
      const body = await readJsonBody(req);
      const { contents, systemInstruction, generationConfig } = body;

      if (!Array.isArray(contents)) {
        sendJson(res, 400, { error: 'Invalid payload. "contents" must be an array.' });
        return;
      }

      const result = await proxyGemini({ contents, systemInstruction, generationConfig });
      if (!result.ok) {
        sendJson(res, 502, { error: result.error });
        return;
      }

      sendJson(res, 200, result.data);
    } catch (error) {
      sendJson(res, 500, { error: error.message || 'Server error while contacting Gemini.' });
    }
    return;
  }

  serveStaticFile(parsedUrl.pathname, res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`DoomsBot server running on http://0.0.0.0:${PORT}`);
});
