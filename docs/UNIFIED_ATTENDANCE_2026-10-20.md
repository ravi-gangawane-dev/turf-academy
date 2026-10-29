# Unified attendance workspace — 20 October 2026

The staff attendance entry point is `/attendance/check-in-out`. The previous
`/attendance/manual-check-in`, `/attendance/manual-check-out`, and `/attendance/qr`
URLs redirect to it. Admin and Receptionist access continues to require
`attendance:write`; Coach portal routes are unchanged.

## Behavior

- QR scanner, manual arrivals, and manual departures share one responsive page.
- Front/rear camera switching and token entry use the existing QR identity workflow.
  The operator reviews the identity and confirms check-in or check-out.
- Arrivals contain enrollments without a check-in time; departures contain checked-in
  enrollments without a check-out time. Both support name, ID, and batch search.
- Multiple manual selections save sequentially through the existing facade/outbox.
  Completed selections are cleared; failures preserve remaining selections and report
  partial success. Buttons prevent overlapping submissions.
- An absent QR attendance record with no check-in time is treated as an arrival.
  Completed attendance cannot be checked out again.
- Summary cards distinguish recorded absences from unmarked enrollments. Activity
  contains both arrival and departure events. Batch schedules use available roster data.
- Desktop uses three panels; narrower screens stack them. Tool shortcuts move focus
  to their respective panel, with reduced-motion preference respected.
- Camera cleanup retains its element reference so streams stop even if navigation
  detaches the page before the camera starts playing.

## Scope

The existing attendance workspace loads up to 500 enrollments. The summary explicitly
refers to the loaded roster and links to calendar totals. This change does not redesign
backend paging, deploy a migration, change business-date rules, or send notifications.
Physical-device camera/PWA acceptance and new live-backend acceptance remain separate.

## Verification

Production build passed. All 13 targeted browser tests passed, including desktop/mobile
manual workflows, bulk selection, QR check-in/check-out, repeat-checkout prevention,
320?1536px overflow checks, accessibility, legacy redirects, camera permission errors,
simulated QR decoding, startup cancellation, history/calendar, and shared page controls.
Relevant regressions:
`qr-attendance-page.spec.ts`, `manual-attendance-layout.spec.ts`,
`combined-attendance-qr.spec.ts`, `ui-recovery-mobile.spec.ts`,
`attendance-history-calendar.spec.ts`, and `page-hero.spec.ts`.
