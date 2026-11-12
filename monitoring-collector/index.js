const http = require('http');

const port = Number(process.env.PORT || 3001);
const allowedOrigins = new Set((process.env.ALLOWED_ORIGINS || 'http://localhost:4200,http://127.0.0.1:4200,http://127.0.0.1:4202').split(',').map(value => value.trim()));

const server = http.createServer((req, res) => {
  res.setHeader('Vary', 'Origin');
  if (req.headers.origin) {
    if (!allowedOrigins.has(req.headers.origin)) {
      res.writeHead(403);
      res.end('Origin not allowed');
      return;
    }
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
  }
  if (req.method === 'OPTIONS' && req.url === '/errors') {
    res.writeHead(204, {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '600',
    });
    res.end();
    return;
  }
  if (req.method === 'POST' && req.url === '/errors') {
    let body = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > 65536) {
        if (!res.writableEnded) { res.writeHead(413); res.end('Report too large'); }
        return;
      }
      body += chunk.toString();
    });
    req.on('end', () => {
      if (res.writableEnded) return;
      try {
        const payload = JSON.parse(body);
        console.error('🔔 Received error report:', JSON.stringify(payload, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', receivedAt: new Date().toISOString() }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: 'Invalid JSON' }));
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(port, () => {
  console.log(`🔔 Monitoring collector running at http://localhost:${port}/errors`);
});
