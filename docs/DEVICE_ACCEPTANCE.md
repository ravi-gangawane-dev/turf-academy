# Device acceptance checklist — QR / PWA

What automation already covers (CI job `pwa`, `e2e/pwa/pwa.spec.ts`, green on the
production bundle): manifest is served and valid, every declared icon resolves,
`ngsw-worker.js` registers and takes control, and an offline reload still renders the
app shell.

What still requires a real phone. Run it against the HTTPS deployment, signed in as an
admin or coach.

## 1. Install / standalone

- [ ] Open the deployed URL in Chrome (Android) and Safari (iOS).
- [ ] Install prompt appears (Android: "Add to Home screen"; iOS: Share → Add to Home Screen).
- [ ] Launched from the home screen, the app opens without browser chrome.
- [ ] App icon and name show "Turf Cricket Academy" / "Turf Academy".
- [ ] Rotate to landscape and back; layout stays usable.

## 2. Camera and QR attendance

- [ ] Open Attendance → QR attendance; the browser asks for camera permission once.
- [ ] Denying permission shows a readable message, not a blank scanner.
- [ ] Scanning a student QR (`TCA:qa-camera-student` fixture or a real student card)
      checks the student in and shows the success state.
- [ ] Second scan of the same student the same day is handled (no duplicate record).
- [ ] Works on the rear camera and in low light.

## 3. Offline queue

- [ ] Go offline (airplane mode) and record attendance manually.
- [ ] The pending item is visible in the offline queue with a clear "pending" state.
- [ ] Reload while offline: the app still opens (service-worker shell).
- [ ] Reconnect: the queued item flushes once, and only once.
- [ ] Re-open the offline queue after flush; nothing is left stuck as pending.

## 4. Auth on device

- [ ] Sign in with a real account; the session survives an app restart.
- [ ] Password recovery: request a link, open it on the phone, set a new password.
      (Requires `site_url` and the redirect allowlist to be set to the deployed origin —
      see `RELEASE_BLOCKERS_2026-10-29.md`.)
- [ ] Sign out clears the session and returns to the login screen.

Record the device model, OS version, browser version and the evidence screenshots with
the release ticket.
