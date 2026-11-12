// Same-origin collection, including failures before sign-in. Netlify retains
// structured function logs; this endpoint never writes application records.
const MAX_BYTES = 16384;
const reply = (status, body) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

function clean(value, limit) {
  return value.slice(0, limit)
    .replace(/Bearer\s+[^\s]+/gi, 'Bearer [redacted]')
    .replace(/(https?:\/\/[^\s?#]+)[?#][^\s)]+/gi, '$1?[redacted]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email]');
}

export default async function handler(request) {
  if (request.method !== 'POST') return reply(405, { error: 'POST required' });
  const origin = new URL(request.url).origin;
  if (request.headers.get('origin') !== origin) return reply(403, { error: 'Same-origin request required' });
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return reply(415, { error: 'JSON required' });
  }
  const reader = request.body?.getReader();
  if (!reader) return reply(400, { error: 'Report required' });
  const decoder = new TextDecoder();
  let text = '', size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_BYTES) { await reader.cancel(); return reply(413, { error: 'Report too large' }); }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
    const payload = JSON.parse(text);
    if (!payload || typeof payload.message !== 'string' || !payload.message.trim()
      || typeof payload.url !== 'string' || typeof payload.release !== 'string'
      || typeof payload.occurredAt !== 'string' || !Number.isFinite(Date.parse(payload.occurredAt))
      || (payload.stack != null && typeof payload.stack !== 'string')) {
      return reply(400, { error: 'Invalid report' });
    }
    const page = new URL(payload.url);
    if (page.origin !== origin) return reply(400, { error: 'Invalid page origin' });
    console.error(JSON.stringify({ event: 'client_error', message: clean(payload.message, 2000),
      stack: payload.stack ? clean(payload.stack, 8000) : null,
      url: `${page.origin}${page.pathname}`, release: clean(payload.release, 80),
      occurredAt: payload.occurredAt, receivedAt: new Date().toISOString() }));
    return reply(202, { accepted: true });
  } catch {
    return reply(400, { error: 'Invalid report' });
  } finally { reader.releaseLock(); }
}
