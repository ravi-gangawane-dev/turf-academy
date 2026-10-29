# Project functionality

The application has four roles: Admin, Receptionist, Coach, and Parent. Route guards and database policies control access; having a screen in the project does not grant every role access to it.

| Area | Functions |
|---|---|
| Authentication | Sign-in, session restoration, sign-out, account-status checks, role and permission guards |
| Dashboards | Role-specific summaries and quick actions |
| Students | Registration, search, profiles, editing, photos, documents, medical records and history |
| Parents | Contact records, profiles, photos and student linking |
| Coaches | Coach records, profiles, specializations and batch assignments |
| Batches | Batch management, student allocation, coach assignment, schedules and capacity views |
| Enrollments | Create, transfer, pause, reactivate, cancel, fee-plan selection, filtering and CSV export |
| Enrollment history | Recorded events, dates, actors and reasons; search, filters, pagination and export |
| Attendance | Manual and QR check-in/out, history, calendar views, corrections and offline synchronization |
| Fees | Fee plans, monthly charges, discounts, late-fee rules, pending balances and summaries |
| Payments | Payment recording, partial/full settlement of charges, transaction history, receipts and Admin refunds |
| Notifications | Activity logs, channel/status filters, templates and delivery-status views |
| Reports | Attendance, fees, outstanding balances, enrollments, revenue, coach/batch reports and CSV export |
| Academy settings | Academy/contact information, timezone, currency, attendance grace period, fee due day and notification channels |
| User management | Staff accounts, roles and account status |
| Settings tools | Role permission reference, device appearance preferences and paginated JSON records export (Admin only) |
| Coach portal | Assigned students/batches, attendance, correction requests, schedules, notifications and profile |
| Parent portal | Linked children, attendance, schedules, fees, payments, notifications and profile |
| Mobile/PWA | Responsive layouts, installable application support and offline attendance queues |

WhatsApp and email delivery require a configured delivery worker and provider credentials. SMS is no longer a configurable app channel; legacy delivery support remains for existing SMS records. Notification logs/templates alone do not send messages. See [notification delivery setup](NOTIFICATION_DELIVERY_SETUP.md).

This is a functionality catalog, not an assertion that every route or deployment integration has been audited. See [continuation status](CONTINUATION_STATUS.md) for the latest fixes and verification.
