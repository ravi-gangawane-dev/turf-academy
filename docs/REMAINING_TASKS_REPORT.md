# Remaining tasks report

Reviewed locally: 13 October 2026

The six requested UI areas have been addressed in code and local automated checks. This does not certify live email delivery, production deployment, or physical-device behavior.

## Remaining acceptance and release work

| Priority | Task | What remains |
|---|---|---|
| Before release | Real account recovery | Use a designated test account to receive an actual recovery email, follow its link, update its password, and sign in again. Verify production redirect settings and expired links with the provider. Local screen validation, invalid/expired-code messages, password submission, and success navigation are tested. |
| Before release | Physical-device PWA acceptance | On the intended Android/iOS phones, verify installation, camera permission prompts, scanning a printed QR code, app updates, and reconnecting with queued attendance. Browser tests cover permission denial, decoding simulated camera video, manifest/icons, service-worker registration/update checks, offline reload and reconnect. Unit tests cover attendance queue replay. |
| Before release | Deploy and verify release | Deploy the final build to the intended HTTPS host, verify backend migrations/functions and environment settings, then smoke-test Admin, Receptionist, Coach and Parent workflows. No deployment was performed in this UI pass. |
| High, if required | External notifications | Configure provider credentials and approved email/SMS/WhatsApp senders/templates, then verify actual delivery to an authorized test recipient. Provider readiness was not queried. |
| Documentation | Reconcile historical audit/deployment notes | Older documents may still describe implemented features as missing. This report records the current local UI work; historical deployment claims still need a release review. |

## Completed locally

- **Consistent list layouts:** Shared card spacing and responsive filter/action sizing across student, parent, coach, batch, enrollment, fee, payment, notification and settings lists. Reused `FilterBar` for previously custom toolbars; preserved existing filter/export/reset behavior. Enrollment History groups its actions with its filters. Removed conflicting Parent List toolbar styling and Student-only sizing overrides.
- **Shared page headers:** Migrated staff, dashboard, parent and reference-page headers to `PageHero`. Added routed breadcrumbs, a non-interactive current-page label, explicit button types, disabled/busy actions, configurable branding and projected action/detail controls. Preserved dashboard shortcuts, searches and child selectors. Detail profile names now use section headings beneath the page heading. Authentication/access screens retain their dedicated layouts.
- **Medium-priority shared UI findings:** Replaced custom profile, attendance, payment and notification badges with `StatusBadge`, with normalized labels and consistent attendance/refund/delivery mappings. Parent Details and Audit Logs use shared pagination with working page-size changes; audit navigation preserves applied filters. Consolidated repeated loading, empty and error displays with `AsyncState`, preserving retry actions and preventing empty messages during pending/failed requests in the affected lists.
- **High-priority shared UI findings:** Wired row-size changes and page resets in Coaches, Batches, Enrollments list/history, Fees, Payments and Attendance history/calendar. Shared pagination includes the current size. Fee Plan, Record Payment and Add Monthly Charge dialogs use `ModalFocus`. Parent dashboard amounts preserve decimals through `AcademyMoneyPipe`; Fee Plan inputs display the configured currency.
- **Coach and parent directory cleanup:** Removed unreachable inline forms, obsolete detail/schedule/payment views, sample coach sessions and their unused handlers. Dedicated add/edit/detail routes remain in use. Missing coach emails display ?Not provided? instead of fabricated addresses. Directory templates are now 149 and 164 lines instead of over 1,000 each.
- **Shared portal support:** Coach and Parent portals share the configured support component. Parent support is accessible even without a linked child. Removed duplicated parent heading markup and hard-coded support contacts.
- **User-facing errors:** Database, pagination, storage, student/parent/coach, attendance, settings and account-management boundaries map failures to safe, actionable messages. Raw SQL/provider details are not used as display messages at those boundaries; diagnostic causes are retained where applicable.
- **Password recovery UI:** Revalidated controls after changing validators, fixing the hidden-email validation blocker on password reset. Added duplicate-submission protection, invalid/expired-link feedback, a new-link action, field guidance and an accessible password-visibility button.
- **Mobile QR controls:** Fixed the scanner overlay intercepting taps on Start Camera. Browser coverage includes denied permission, manual invalid-code handling and successful QR decoding from a simulated camera stream.
- **Refund totals:** Verified partial/full refund handling, gross/refunded/net report values, date/batch scope, and the parent profile's full net aggregate rather than its visible payment page.
- **Large datasets:** Verified 1,103-row report/directory reads under a server cap of 137 and 1,101 refunds. Parent CSV now fetches all matching pages with stable filters/order. Audit CSV uses the same complete-page reader and preserves its initial filter snapshot.
- **Earlier completed work:** Dashboard Recent Activity with loading/empty/error/retry states; report batch filters and academy currency; latest-request protection for coach attendance; consistent audit-export filters.

## Validation

- Full unit suite: 154 tests passed, including PageHero navigation/actions/projection, shared status mappings, Parent Details pagination/states, audit applied-filter pagination, page-size selection/reloads and fee-dialog focus, Escape and busy-state checks.
- PageHero browser checks: 22 migrated screens at desktop and mobile widths (44 screen/viewport combinations), plus header actions, navigation and search controls.
- List layout browser checks: 8 list pages at desktop/mobile widths (16 combinations), aligned desktop controls, mobile bounds and working reset behavior; 32 general responsive checks also passed.
- Browser access checks: 5 passed.
- Mobile recovery/camera checks: 3 passed.
- Production PWA check: passed manifest/icons, service-worker registration, offline reload, reconnect and service-worker update request.
- Final production build: passed. Responsive checks: 32 screen/viewport combinations passed.

No real email delivery or physical-device installation/scanning is claimed by these automated checks.

## Optional enhancements

- General report PDF downloads (CSV and payment receipt PDFs already exist).
- Scheduled/bulk external notification delivery.
- Full backup/restore including uploaded files and authentication data (current settings export is records-only).
