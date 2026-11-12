# Feature and functionality report — 10 November 2026

Scope: current local source, fresh automated checks, and reconciliation of recorded live evidence. No production mutations, external messages, deployment, or application-code changes were performed. Passing mock tests do not certify production behavior.

## Confirmed current limitations and failures

| Area | Finding | Impact and evidence | Priority |
| --- | --- | --- | --- |
| Offline attendance | Disabled by configuration | `src/app/core/config/api.config.ts:25` sets `allowOfflineAttendance: false`. Staff and coach outbox services reject enqueue when disabled. Attendance recording requires connectivity; offline replay is not an available production capability under this configuration. Intentional limitation, not a newly reproduced regression. | Medium if offline operation is required |
| Code quality gate | Lint fails with 26 errors | Fresh `npm run lint` fails. Findings include explicit `any`, unused declarations, and six template accessibility-rule violations across export, print preview and ID-card backdrops. These do not by themselves prove the dialogs are unusable: modal focus/dismiss directives are present. Full details: `artifacts/audit-current-lint.log`. | Medium |

## Previously reported failures or incomplete capabilities

These are recorded findings, not newly verified production failures.

| Area | Last recorded state | Required verification |
| --- | --- | --- |
| Automated WhatsApp | Provider attempt failed with `The ContentSid is Invalid`; no subsequent delivery confirmation established in the reviewed records. Manual click-to-chat is separate. | Correct provider template configuration and verify an explicitly authorized delivery and callback. |
| Notification email | Earlier missing Resend credentials; delivery remains unconfirmed. Auth recovery email is a separate system. | Verify current configuration and authorized delivery. |
| Birthday/event automation | Previously intentionally paused; current scheduler state unknown. | Read scheduler state and verify generation before enabling as intended. |
| Full disaster recovery | A 5 November native database restore matched 80 tables and 1,105 rows. Uploaded object bytes, hosted/provider settings, role passwords and ownership restoration were excluded. | Establish and rehearse the remaining recovery coverage and durable backup arrangements. |

Sources: `docs/KNOWN_ISSUES.md` and the 5 November follow-up in `docs/RELEASE_READINESS_2026-11-04.md`. Later evidence takes precedence over older checklist items in the same documents.

## Unverified, not confirmed broken

- Current frontend publication and production error-collector operation.
- Password recovery on the hosted production domain.
- Physical Android/iOS QR scanning and installed-PWA acceptance.
- Complete four-role live acceptance: the latest readiness evidence lacks an active Receptionist fixture and comprehensive positive/negative Coach/Parent fixtures.
- Full live acceptance for photos/documents/medical editing, batch scheduling and waitlist promotion, discounts/late fees, administrative mutations, and representative large-data reports. Local implementation or selected historical checks do not establish every production workflow.

## Fresh checks

| Check | Result | Evidence |
| --- | --- | --- |
| Production build | Passed | `artifacts/audit-current-build.log` |
| Unit suite | 776 passed across 142 files | `artifacts/audit-current-unit.log` |
| Script suite | 39 passed | `artifacts/audit-current-scripts.log` |
| Browser auth/access and route checks (mock backend) | 7 passed | `artifacts/audit-current-browser.log` |
| Lint | Failed: 26 errors | `artifacts/audit-current-lint.log` |

## Superseded findings

- Parent editing now merges existing communication preferences (`parent-form-page.ts:106`); the old claim that editing always removes WhatsApp opt-out is stale.
- QR identification uses `Asia/Kolkata` (`supabase-attendance.repository.ts:154`); the old UTC-versus-India finding is stale for this path.
- The lint target exists and runs; its current failure is rule violations, not a missing Angular target.
- The 4 November live workflow follow-up records student creation, enrollment, attendance, payment, receipt and report checks passing. Those modules should not be labelled entirely broken based on older reports.
- Database restore rehearsal has been completed for the native backup scope; claims that no restore was ever rehearsed are superseded. Full hosted recovery remains incomplete.

Recommended order: resolve provider delivery failures if automated notifications are required, complete recovery coverage and production/all-role acceptance, then clear lint. Confirm whether offline attendance belongs in the intended delivered scope before changing its deliberate configuration.
