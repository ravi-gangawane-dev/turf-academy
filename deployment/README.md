# Production deployment

Deploy the contents of `dist/turf-academy-ui/browser` after `npm run build`.

Required host behavior:

- Serve unknown application routes through `index.html`.
- Proxy `/api/v1` to the backend; never rewrite API errors to `index.html`.
- Serve over HTTPS so camera, service worker, and install behavior are available.
- Do not cache `index.html`, `ngsw.json`, or `ngsw-worker.js` for long periods.
- Cache hashed JavaScript/CSS assets as immutable.
- Preserve `Idempotency-Key`, `Authorization`, and `X-Correlation-ID` headers.

The included `nginx.conf.example` demonstrates those rules. Replace the API upstream and server name for the target environment.

Release commands:

```bash
npm test -- --watch=false
npm run test:e2e
npm run build
npm run test:e2e:pwa
```
