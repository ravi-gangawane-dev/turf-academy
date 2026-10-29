# QR Camera Capture and Decoding Plan

## Goal

Verify and, where needed, fix the `/attendance/qr` flow so it can acquire a camera
stream, decode a real QR image from video frames, and hand the decoded value to
student identification without compromising manual code entry.

## Plan

1. Trace camera startup, decoding, cleanup, and student identification in
   `QrAttendancePage`; inspect the existing browser test and its camera mocks.
2. Run the focused QR browser test to reproduce the current behavior. Treat this
   as verification of the real `html5-qrcode` decoder against a camera-like video
   stream, not as proof of access to a physical device camera.
3. Harden scanner lifecycle: prevent duplicate starts, cancel stale start
   attempts, release the stream after scan/stop, and report useful camera setup
   and cleanup errors. Preserve manual code entry and attendance confirmation.
4. Cover successful decoding, stream release, permission denial, and unavailable
   camera fallback in focused browser tests.
5. Run the focused browser test and production build; record exact outcomes below.

## Verification evidence

The scanner prevents parallel camera starts, handles stale in-progress starts
without leaving the scanner attached, and observes camera startup so a stream
that arrives after navigation is stopped immediately. It checks browser
camera/secure-context support, maps permission/device/busy errors to actionable
messages, and surfaces cleanup failures. Camera cleanup attempts to stop the
library scanner and explicitly stops the underlying video tracks if scanner
shutdown fails.

The focused Playwright test uses the real `html5-qrcode` decoder and a generated
QR image delivered through a browser video stream. It verifies successful
camera-stream acquisition, delayed QR decoding, identification of
the seeded QA camera student, that the laptop/front camera is requested first,
and that the captured video track is ended after identification.
Additional cases verify permission-denied and no-compatible-camera messages and
retain manual code entry. A delayed camera-request case verifies that navigation
away during startup ends the late-arriving video track. This validates
capture/decoder integration without claiming access to a physical device
camera.

## Physical-camera QA data

The development-only E2E mock dataset includes an active student named
`QA Camera Test Student`, enrolled in `Morning Pro`. Its QR payload is
`TCA:qa-camera-student`; the printable image is [qa-camera-student-qr.png](./qa-camera-student-qr.png).
No Supabase student or QR profile is created.

To test the laptop webcam, start the mock app with
`npm start -- --configuration=e2e --host 127.0.0.1 --port 4200`, sign in as
`admin@turf.local` with password `academy123`, then open `/attendance/qr` and
start the camera. Show the QR image on a separate phone/screen or print it;
the laptop webcam cannot reliably scan a QR displayed on its own screen. The
local mock app is currently available at `http://127.0.0.1:4200/`.

| Check                                                                                           | Result                                                    |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Focused QR camera browser tests (`npx playwright test e2e/ui-recovery-mobile.spec.ts --grep "QR | camera stream"`)                                          | Passed: 4 tests |
| QA student QR identity test                                                                     | Passed                                                    |
| Production build (`npm run build`)                                                              | Passed                                                    |
| Physical device camera check                                                                    | Not run; requires a device/browser with camera permission |
