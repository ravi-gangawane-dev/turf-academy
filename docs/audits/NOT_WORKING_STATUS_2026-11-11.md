# Not-Working Issue Register

**Status snapshot:** 4 November 2026 P0/P1/P2 audit, reconciled with the 10 November 2026 feature-health report. Updated 12 November 2026 after the printable profile sheets and the print paper/orientation setup.  
**Recreated:** 11 November 2026 in `docs/audits/` because the earlier copies under `test-results/print-audit/` were removed when a Playwright run cleared `test-results/`.

**Status keys:** Working / Partial / Missing / Needs Improvement.

## 1. Summary

| Group | Partial | Missing | Needs Improvement | Total |
|---|---:|---:|---:|---:|
| P1 audit items | 2 | 0 | 0 | 2 |
| P2 audit items | 2 | 6 | 0 | 8 |
| Other confirmed limitations (10 Nov report) | — | — | — | 5 |
| **Total not Working** | **4** | **6** | **0** | **15** |

All P0 items are Working/Resolved.

## 2. P1 — not Working

| # | Area | Issue | Status | Remaining problem |
|---|---|---|---|---|
| 1 | RBAC | Create user (invite) | Partial | Invitation-only. Custom SMTP and real mailbox acceptance cannot be verified without provider credentials; no create-with-password path. A copyable, single-use fallback link now covers undelivered email, but the admin still hands it over manually. |
| 2 | RBAC | Invitations (invite/resend/revoke lifecycle) | Partial | Pending/failed/expired states exist. A copyable fallback link was added for pending/failed/expired rows and the invite form, but actual email delivery and mailbox acceptance still have no staging/provider proof. |

**Residual P1 defects carried into P2:**
- **P-09 Stored PDF staleness** — resolved on 11 November 2026. Legacy stored receipt files are no longer surfaced in the parent portal; receipts are rendered from live records (formerly P2-6, now removed from the table).
- **P-11 CSV safety residual** — resolved on 11 November 2026. Coach-portal and attendance-calendar exports now use the shared CSV builder (UTF-8 BOM and formula-injection escaping); both use the shared export dialog.

**Resolved in this pass (11 November 2026):**
- **P1 invitation fallback link** — the invite dialog now offers **Create a link instead**, and pending/failed/expired rows offer **Copy link**. The new Edge `link` action validates the role against the catalogue, refuses confirmed accounts (`account_exists`, so an admin cannot take over an existing login), reuses or updates the invitation row, and calls `auth.admin.generateLink` (`invite` for new accounts, `magiclink` for unconfirmed existing accounts). The returned link is shown once to the signed-in admin in a custom dialog, is never emailed or written to the audit log, and the audit entry is `invitation_link_generated`. This removes the SMTP dependency for account activation but does not replace the provider-delivery proof, so the P1 items stay Partial until a real mailbox accepts an invitation.
- **P2-6 Stored receipt freshness (P-09 residual)** — the parent portal no longer offers legacy stored receipt files as the receipt of record. The receipt screen and its preview/print/PDF actions always render from the live payment record, and the per-row `createSignedUrl` calls were removed, so one storage request per payment row is gone as well. `ParentPortalService` test coverage asserts the receipt is returned without a signed URL.
- **P2-7 Legacy receipt signed-URL download (P-08 residual)** — the “View stored copy” action was removed, so the portal never opens a short-lived URL. PDF export continues through the preferred browser print dialog, now with a stable suggested filename derived from the document (`Receipt-RCP-42`, `Batch-roster-RST-BMOR`, …) via `printFileName()`, and the original page title is restored when the dialog closes. Covered by `print-document.service.spec.ts`.
- **P2-8 Attendance calendar CSV** — monthly and weekly summaries now render as tables behind the shared `TableTools` export dialog; the record list uses a server-side loader that exports every matching page. Column definitions and row builders move to `attendance-calendar-export.ts`; the old bespoke CSV string builder was removed.
- **P2-9 Coach portal attendance CSV** — the duplicate custom export button was removed. The attendance table now uses `TableTools` with real column keys and `CoachPortalService.attendanceHistoryAll()`, which pages through every filtered record instead of only the visible client list.
- **Code quality gate** — `npm run lint` now passes with zero errors. Fixed explicit `any` in batch workspace, domain services, batch details and fees; removed unused declarations; added `role="presentation"` to the export, ID-card and print-preview backdrops so the accessibility rules see them as non-interactive.

**Resolved on 12 November 2026:**
- **P2-1 Student/parent/coach profile sheets** — added a shared `profile-sheet` print document with A4 portrait styling (`@page profile-page`). Student, parent and coach details pages now offer **Profile sheet** beside the existing ID-card action and open the sheet in the shared preview destination. Every value comes from the live record: student sheets include personal/contact/guardian/enrollment/attendance sections, an optional medical section (only when the record is returned), a completeness checklist and the actual `student_documents` rows grouped by document type; parent sheets include contact, address, account and linked-student sections with a profile checklist; coach sheets include contact, employment, specialisation, assigned-batch and biography sections with a profile checklist. References are derived from the real academy id (`PRF-STU-…`, `PRF-PAR-…`, `PRF-COA-…`). The checklist states what the academy has recorded; it is labelled in the sheet as a record-completeness view rather than a compliance requirement. The app still has no document-upload screen, so student sheets list documents that already exist in `student_documents` (up to 200 rows, with a note when the total is higher). Verified with 53 focused tests across 7 files, ESLint clean, and a development build.
- **P2-2 Paper size and orientation selector** — the shared print preview now offers **Paper size** (A4, A5, Letter) and **Orientation** (portrait, landscape) controls. The choice is remembered per document type in local storage (`academy-print-page-setup`) and applied to subsequent direct prints as well, through a one-run `@page` override that is removed when the browser print dialog closes. The override also sets the matching content height so explicit page footers still reach the paper edge, reproduces the existing per-document margins, and leaves the preview paper width in step with the chosen sheet; **Use default** clears the remembered choice. CR80 ID cards stay fixed on A4 portrait because the card and crop geometry is physical, and the preview says so instead of showing an unusable selector. Verified with 42 focused tests across 4 files (helpers, preference service, preview, print service), ESLint clean, and a development build.

## 3. P2 — not Working

| # | Area | Issue | Status | Remaining problem |
|---|---|---|---|---|
| 3 | Print/export | Configurable letterhead/footer | Partial | Logo, name and contact come from settings; address, registration number, terms and custom footer text are not configurable. |
| 4 | Print/export | Print queue / batch print | Missing | No multi-select or batch print across cards/receipts; only 2-up CR80 for one holder. |
| 5 | Print/export | Localisation | Partial | Timezone/currency used in places; labels are not translated and coverage is not systematic. |
| 10 | RBAC | Create user with temporary password | Missing | Invitation-only; no direct create-with-password UI or Edge action. |
| 11 | RBAC | Delete user | Missing | No hard delete; status/suspend only. Policy should be explicit. |
| 12 | RBAC | Multi-role support | Missing | One `profiles.role` enum per user; no multi-role or scoped permissions. |
| 13 | RBAC | Per-user permission overrides | Missing | Matrix is role-based only; no per-user grants or revocations. |
| 14 | RBAC | Delete/deactivation policy | Missing | Retention, anonymisation and deactivation rules are not documented. |

## 4. Other confirmed current limitations — 10 November 2026 report

| # | Area | Finding | Impact |
|---|---|---|---|
| 1 | Offline attendance | Disabled by configuration (`allowOfflineAttendance: false`) | Attendance requires connectivity; offline replay is not a production capability under this configuration. Intentional limitation. |
| 2 | Automated WhatsApp | Provider attempt failed with `The ContentSid is Invalid`; no later delivery confirmation | Automated WhatsApp delivery is not confirmed working. Manual click-to-chat is separate. |
| 3 | Notification email | Earlier missing Resend credentials; delivery unconfirmed | Notification email delivery is not confirmed. Auth recovery email is a separate system. |
| 4 | Birthday/event automation | Previously paused; current scheduler state unknown | Automation cannot be claimed working until the scheduler is read and generation verified. |
| 5 | Full disaster recovery | Native database restore verified (80 tables, 1,105 rows) | Uploaded object bytes, hosted/provider settings, role passwords and ownership restoration remain outside tested recovery coverage. |

## 5. Unverified — not confirmed broken

- Current frontend publication and production error-collector operation.
- Password recovery on the hosted production domain.
- Physical Android/iOS QR scanning and installed-PWA acceptance.
- Complete four-role live acceptance: latest readiness evidence lacks an active Receptionist fixture and comprehensive positive/negative Coach/Parent fixtures.
- Full live acceptance for photos/documents/medical editing, batch scheduling and waitlist promotion, discounts/late fees, administrative mutations and representative large-data reports.

## 6. Blocked verification gaps

| Area | Gap | Why it is not verified |
|---|---|---|
| Database | `202611040001_user_access_guard.sql` and `202611040002_role_catalog.sql` not applied remotely | Remote migration history is inconsistent; decision was to leave the remote database unchanged pending manual review. Deployed code uses the compiled role fallback. |
| Database/API | Live PostgREST, RLS and session-disable checks | Require staging credentials and a controlled account. |
| Email | Invitation delivery and mailbox acceptance | Requires custom SMTP/provider credentials and a non-team mailbox. |
| Deployment | `admin-manage-users` `link` action | Implemented and unit-tested locally; the deployed function is still version 13, so the browser fallback returns `invite_link_failed` until the updated function is deployed. Edge type-checking with `deno check` is unavailable because Deno is not installed locally. |
| Print | CR80 duplex/crop alignment and QR scanning | Human-only physical checks. |
| Notifications | Operational acceptance | Carried from earlier audit; staging/provider-blocked. |
| Attendance | Live name/code search | Carried from earlier audit; staging-blocked. |
| Refunds | Approver visibility under `profiles` RLS | Carried from earlier audit; prints `—` when RLS hides the profile; staging-blocked. |

## 7. Known test-only issue

- `src/app/features/payments/payments-page.spec.ts:47` — unrelated `queryParamMap` mock failure, intentionally left untouched.

## 8. Recommended order

1. Fix provider delivery for invitations and notifications, then verify with real credentials.
2. Review and apply the two RBAC migrations, then run staging RLS/session-disable checks.
3. Complete the four-role live acceptance and the unverified workflows.
4. Address the remaining P2 print/export and RBAC follow-ups: batch print, configurable letterhead/footer, and localisation.
