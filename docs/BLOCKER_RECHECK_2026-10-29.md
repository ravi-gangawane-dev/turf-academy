# Blocker recheck — 29 October 2026

These results supersede the earlier missing-RPC and monitoring-complete claims.

| Item | Result |
| --- | --- |
| Manual WhatsApp RPC | Exists in live. Real Admin and Receptionist QA sessions successfully queued QA-only records, requested manual activity, and cancelled it. No external message was sent. |
| Notification filters | Student, recipient and batch RPC queries succeeded for Admin and Receptionist. |
| Role checks | Parent and Coach were denied staff filter/manual RPC operations with `42501`. This verifies these workflows, not every policy on all 35 tables. |
| Migration history | RPC migrations were recorded under generated 20261029 timestamps; missing original version strings do not mean the functions are absent. No migrations were reapplied. |
| Recovery email | Still unverified. Requires an authorized real inbox, deployed redirect origin and working Auth mail configuration. Null custom SMTP settings alone do not prove all email delivery is impossible. |
| QR attendance | Prior live QA verified decoding and persisted check-in/out; physical phone-camera and installed-PWA testing remain pending. |
| Monitoring | A deliberately triggered error in the running Angular app produced a report, but the original collector request failed in the browser. Added allowed-origin CORS/preflight handling, configurable port, and a 64 KiB request limit. |
| Monitoring retest | Browser-only endpoint override to an isolated updated collector on port 3002 returned HTTP 200 with no failed request. Original running collector on 3001 was not restarted. Production remains blocked on a public HTTPS collector; production configuration still points to localhost. |
| Automated WhatsApp | Prior requested delivery failed with Twilio `The ContentSid is Invalid`. A valid template Content SID is still required. |

Additional verification: disposable PostgreSQL notification migration, integrity,
events, manual activity, role isolation, automation guards and filter tests passed.
Collector allowed preflight, rejected-origin, malformed JSON and oversized-body
checks passed. Evidence from live QA and browser tests is stored locally under
gitignored `tmp/qa-setup/`; credentials remain outside source control.
