# Error collector

Run `node monitoring-collector/index.js` from the repository root. Restart an
already running collector after changing its source.

- `PORT` defaults to `3001`.
- `ALLOWED_ORIGINS` is a comma-separated list of exact application origins.
  The defaults permit local development on localhost:4200, 127.0.0.1:4200,
  and 127.0.0.1:4202. Set this explicitly for a deployed application.
- `/errors` accepts JSON POST requests and browser CORS preflight requests.
  Disallowed browser origins are rejected, and bodies are limited to 64 KiB.

This collector logs reports to its process output. Production requires a public
HTTPS endpoint, persistent log collection/retention and alerting. Configure the
application's monitoring endpoint with that URL; localhost targets the visitor's
computer and is unsuitable for a hosted production application. CORS is a browser
control, not authentication; add ingress rate limits when exposing this service.
