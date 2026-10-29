# Rahul and Sunil Patil attendance verification

Verified against the project's configured live Supabase backend on 21 October 2026, using the local Angular live build. Source fixes have not been deployed to a hosted frontend.

## Records

| Record | ID | Result |
|---|---|---|
| Rahul Patil | `321f6158-dc89-4c69-932b-67345736c1eb` | Created active; reused on continuation |
| Sunil Patil | `3b323daf-af9e-469b-876a-7d0477efac58` | Created active; DOB `1992-06-07` |
| Enrollment | `8b80b3a1-6adc-4d61-801a-fde09eb2de73` | Active in existing test batch `E2E Assigned b23cc8a6` |
| Attendance | `f3378256-2a32-42c5-b547-aaecabc8e346` | Checked out |

The `student_parents` composite key links these IDs with `is_primary=true`. Rahul's phone is `9130451715`, and communication preference is enabled. India and country code `+91` are recorded in the existing address JSON; the schema has no dedicated country-code field. Sunil has no separate phone requirement. No Auth accounts or database structures were created.

Attendance requires an active enrollment. The existing test batch has a ₹1,000/month fee plan; no payment was recorded. Existing coaches, admins, batches and unrelated parents were preserved, including two other parents sharing the requested phone number. Name and DOB checks prevent repeated execution from creating another Sunil record.

Schema review used project migrations and live table/RPC operations. The live OpenAPI schema endpoint refused access with the available public API key. The existing transactional student registration RPC always creates a new parent, so it could not reuse Rahul. Student insertion, relationship upsert and enrollment creation therefore used separate checked requests; enrollment used the existing transactional RPC. All final rows were read back and verified.

## Attendance and notifications

All times below are IST on 21 October 2026.

| Action | Saved time | In-app notification | API provider result |
|---|---|---|---|
| Check-in | 3:53:42 PM | Created, `sent` | N/A - WhatsApp not configured |
| Check-out | 3:56:53 PM | Created, `sent` | N/A - WhatsApp not configured |

Check-in already existed when the browser attendance test reached it and was preserved. Check-out was performed through the unified attendance UI. Both saved timestamps and automatic in-app notifications were verified. The saved events were then used to exercise message preparation for both actions without rewriting attendance.

## Source fixes and validation

- Attendance message preparation now retrieves the active primary parent through `student_parents` and reads saved attendance timestamps directly, avoiding empty workspace parent IDs and stale UI rows.
- Both manual-selection and QR-confirmation paths prepare the message after saving. Offline attendance does not prepare a premature message.
- Preparation/open errors are displayed and logged. Existing notification logs display provider failures.
- Message copy includes the parent's name and the appropriate check-in/check-out time. UI wording states that sending is not available for this channel.
- Parent communication form accepts E.164 numbers without truncation.
- Live student/parent lists, detail pages, dashboard loading, notification failure display were checked.
- TypeScript app compilation passed. Thirteen targeted tests passed.

Evidence: `test-results/patil-records.json`, `test-results/patil-attendance.json`, and `test-results/patil-notification-failures.png`. Reproduction scripts are in `scripts/*patil*.mjs`; attendance testing can attempt external delivery only for explicitly configured channels and does not resend failed or already-submitted messages.

## Repeat-request verification

Read-only live verification at 2026-10-21 16:22 IST confirmed exactly one matching parent and one matching student, the primary junction link, enabled communication preference, E.164 recipient, null student phone, active enrollment, and the original completed attendance record. Both in-app notices remain sent; WhatsApp delivery is not configured. No duplicate records or additional send attempts were made. Evidence: `test-results/patil-revalidation.json`. Browser and compilation results above are from the preceding tests in this same session and were not rerun for this read-only verification.