import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../netlify/functions/client-errors.mjs';

const origin = 'https://academy.example';
const payload = { message: 'Failed', stack: 'stack', url: `${origin}/auth/login`, release: 'test', occurredAt: '2026-10-30T00:00:00Z' };
const request = (body, headers = {}, method = 'POST') => new Request(`${origin}/.netlify/functions/client-errors`, {
  method, headers: { origin, 'Content-Type': 'application/json', ...headers },
  ...(method === 'POST' ? { body } : {}),
});

test('collector rejects unsafe requests without recording reports', async () => {
  for (const [req, status] of [
    [request('', {}, 'GET'), 405],
    [request('{}', { origin: 'https://other.example' }), 403],
    [request('{}', { 'Content-Type': 'text/plain' }), 415],
    [request('invalid'), 400],
    [request('null'), 400],
    [request(JSON.stringify({ ...payload, url: 'https://other.example/' })), 400],
    [request('x'.repeat(16385)), 413],
  ]) assert.equal((await handler(req)).status, status);
});

test('collector stores only the expected fields and redacts email, bearer tokens and query strings', async t => {
  const logs = [];
  t.mock.method(console, 'error', value => logs.push(JSON.parse(value)));
  const response = await handler(request(JSON.stringify({ ...payload,
    message: 'Failed for qa@example.com Bearer secret-token',
    stack: 'at https://academy.example/main.js?access_token=secret#fragment',
    url: `${origin}/auth/login?token=secret#fragment`, password: 'do-not-log',
  })));
  assert.equal(response.status, 202);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(logs.length, 1);
  assert.equal(logs[0].url, `${origin}/auth/login`);
  assert.doesNotMatch(JSON.stringify(logs), /secret|qa@example|do-not-log/);
});
