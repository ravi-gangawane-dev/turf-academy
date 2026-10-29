# Improvement recommendations — refreshed

**Audit date: 22 October 2026 (Asia/Calcutta). Audit only: no application code, schema or business-data changes.**

| ID | Module | Capability / scope | Evidence | Priority |
| --- | --- | --- | --- | --- |
| F014 | coach | /coach/dashboard — route/read experience | Dashboard read/render and desktop automated-accessibility scope. color-contrast: 12 nodes production-runtime-2026-10-22.json. | P2 |
| F033 | parent | /parent/dashboard — route/read experience | Dashboard read/render and desktop automated-accessibility scope. color-contrast: 1 nodes production-runtime-2026-10-22.json. | P2 |
| F087 | reports | /reports — route/read experience | Fresh production-preview: admin: LOADED → /reports. Submissions/destructive actions not executed. src/app/app.routes.ts:630 | P2 |
| F104 | reports | /reports/coach — route/read experience | Fresh production-preview: admin: LOADED → /reports/coach. Submissions/destructive actions not executed. src/app/app.routes.ts:741 | P2 |
| F105 | reports | /reports/batch — route/read experience | Fresh production-preview: admin: LOADED → /reports/batch. Submissions/destructive actions not executed. src/app/app.routes.ts:746 | P2 |
| F132 | Architecture | Component decomposition | 69 OnPush components,17 inline templates; coach1125/report723 lines; 21 component specs contain only one creation check. | P3 |
| F150 | Attendance | Large-roster selection | I08: first 500-row workspace page consumed without continuation; current small data does not exercise limit. | P2 |
| F151 | WhatsApp | Settings test recipient | I09: settings uses contactPhone but falls back to9130451715; constructs check-in link while generic test-message variables are unused. Actual attendance remains relationship-driven. | P3 |
| F152 | Accessibility | Representative dashboard accessibility | I10: current dashboard axe violations, detailed below; manual/all-route accessibility incomplete. | P2 |

## Specific recommendations

| Category | Area | Evidence | Recommendation | Impact |
| --- | --- | --- | --- | --- |
| Accessibility | Dashboards | 2 current axe rule violations | Fix current selectors; manual keyboard/screen-reader checks | Accessibility |
| UI/UX | Parent consent | Preferences drop opt-out; status/address now preserved | Retain flags and make consent changes deliberate | Data integrity |
| Responsiveness | Visited pages | 390px/1440px overflow checks; camera/dialog states incomplete | Verify internal table scroll, focus and modal/camera states | Coverage |
| Reusability | Coach/report pages | 1125/723 lines; all 69 components OnPush | Extract cohesive views/query adapters, retain shared controls | Maintainability |
| Performance | Reports/list queries | Reports materialize datasets; current request traces included | Server-page interactive reports; measure repeated counts/config requests before caching | Latency/memory |
| Scalability | Attendance | First 500 rows consumed without continuation | Backend search/page continuation and >500 fixture tests | Roster correctness |
| Security | Offline queues | Shared actorless operations | Bind authenticated subject and validate replay | Attribution/scope |
| Relationships | Parent save/link | Separate calls, primary-parent ambiguity risk | Define atomicity and primary invariants; test partial failures | Consistency |
| Testing | Component specs | 21 single creation checks | Test consent, dates, permissions and state transitions | Behavioral confidence |
| Tooling | Lint | Command has no target | Configure compatible builder/rules | Repeatable checks |
| Configuration | WhatsApp test | Contact fallback and attendance-message builder | Explicit recipient and intentional test text | Avoid misdirected/misleading tests |

## Current dashboard accessibility

| Role | Rules | Selectors | Incomplete checks |
| --- | --- | --- | --- |
| admin | None in selected rules | None | 0 |
| receptionist | None in selected rules | None | 2 |
| coach | color-contrast | .rows > .empty; .row:nth-child(1) > span > small; .row:nth-child(2) > span > small; .row:nth-child(3) > span > small; .row:nth-child(4) > span > small; .row:nth-child(5) > span > small; .dashboard-notifications > .empty; button:nth-child(1) > span > small; button:nth-child(2) > span > small; button:nth-child(3) > span > small; button:nth-child(4) > span > small; .upcoming-card > .empty | 2 |
| parent | color-contrast | .count | 0 |

Zero violations in a selected state is not site-wide/manual certification. Historical findings are not retained as current failures unless reproduced.
