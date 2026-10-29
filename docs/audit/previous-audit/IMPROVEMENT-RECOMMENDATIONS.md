# Improvement recommendations

Audit date: 21 October 2026. **Audit only: no fixes or business-data changes during the audit.** Prior authorized attendance E2E evidence is identified separately.

| ID | Module | Capability | Evidence | Priority |
| --- | --- | --- | --- | --- |
| F014 | coach | /coach/dashboard ? route/read experience | Dashboard renders; automated accessibility violations (I10). Aggregate financial reconciliation not tested. src/app/app.routes.ts:138; ./features/coach/coach-portal-page | P2 |
| F030 | dashboard | /dashboard/admin ? route/read experience | Dashboard renders; automated accessibility violations (I10). Aggregate financial reconciliation not tested. src/app/app.routes.ts:235; ./features/dashboard/dashboard-page | P2 |
| F032 | dashboard | /dashboard/reception ? route/read experience | Dashboard renders; automated accessibility violations (I10). Aggregate financial reconciliation not tested. src/app/app.routes.ts:251; ./features/dashboard/dashboard-page | P2 |
| F033 | parent | /parent/dashboard ? route/read experience | Dashboard renders; automated accessibility violations (I10). Aggregate financial reconciliation not tested. src/app/app.routes.ts:259; ./features/parents/parent-dashboard-page | P2 |
| F087 | reports | /reports ? route/read experience | Rendered for admin. Submissions and exhaustive interactions not executed. I08: interactive display slices an in-memory dataset. src/app/app.routes.ts:629; ./features/reports/reports-page | P2 |
| F104 | reports | /reports/coach ? route/read experience | Rendered for admin. Submissions and exhaustive interactions not executed. I08: interactive display slices an in-memory dataset. src/app/app.routes.ts:740; ./features/reports/reports-page | P2 |
| F105 | reports | /reports/batch ? route/read experience | Rendered for admin. Submissions and exhaustive interactions not executed. I08: interactive display slices an in-memory dataset. src/app/app.routes.ts:745; ./features/reports/reports-page | P2 |
| F132 | Architecture | Component decomposition | 69 OnPush components; 17 inline templates; coach portal 1125 lines, reports 723. | P3 |
| F150 | Attendance | Large-roster selection | I08: first 500-row workspace page consumed without continuation; current small data does not exercise limit. | P2 |
| F151 | WhatsApp | Settings test recipient | I09: fixed Rahul/Sunil test fixture in settings; actual attendance resolver is dynamic. | P3 |
| F152 | Accessibility | Representative dashboard accessibility | I10: automated keyboard-scroll and contrast violations; manual all-route accessibility unverified. | P2 |

| Category | Module | Observed issue | Recommendation | Impact |
| --- | --- | --- | --- | --- |
| UX/data integrity | Parent edit | I04 resets metadata/consent/status | Preserve fields, expose intentional changes | Avoid silent changes |
| Accessibility | Dashboards | I10 keyboard-scroll/contrast violations | Fix selectors below; manual keyboard review | Keyboard/low-vision access |
| Responsiveness | Visited pages | No page overflow at390px; other states unverified | Check internal table scroll and dialogs/camera | Coverage, not a claimed layout defect |
| Reusability | Coach/report views | 1125/723-line multi-view components | Extract cohesive view/query responsibilities | Maintainability |
| Performance | Notifications | Sort/page/filter each issue six backend requests in probe | Separate stable config/templates from list reload; measure caching | Fewer round trips |
| Scalability | Roster/reports | I08 first 500 limit/in-memory display | Server-page interactive data, separate full exports | Large-data correctness |
| Security | Offline | I06 no actor ownership | Partition queues and validate identity before replay | Prevent attribution errors |
| Relationships | Parent save/link | Separate calls; primary selection ambiguity risk | Define atomicity and primary-parent invariants; test failures | Data integrity |
| Code quality | Components | 43 missing specs,17 inline templates; all 69 OnPush | Keep OnPush; extract complex pages and add useful tests | Maintainability |
| Testing | Provider/E2E | I02 compilation and I03 race | Restore full pipeline then deterministic fixture runs | Reliable release evidence |
| Configuration | WhatsApp settings | I09 fixed test recipient | Select explicit configured/existing recipient | Avoid fixture mismatch |

## Automated accessibility results

| Role | Rule | Impact | Nodes | Selectors |
| --- | --- | --- | --- | --- |
| admin | scrollable-region-focusable | serious | 2 | .attendance-chart > .data-chart; .fee-chart > .data-chart |
| receptionist | scrollable-region-focusable | serious | 2 | .attendance-chart > .data-chart; .fee-chart > .data-chart |
| coach | color-contrast | serious | 12 | .rows > .empty; .row:nth-child(1) > span > small; .row:nth-child(2) > span > small; .row:nth-child(3) > span > small; .row:nth-child(4) > span > small; .row:nth-child(5) > span > small; .dashboard-notifications > .empty; button:nth-child(1) > span > small; button:nth-child(2) > span > small; button:nth-child(3) > span > small; button:nth-child(4) > span > small; .upcoming-card > .empty |
| parent | color-contrast | serious | 16 | .count; .overview-content > dl > div:nth-child(1) > dt; .overview-content > dl > div:nth-child(2) > dt; .overview-content > dl > div:nth-child(3) > dt; div:nth-child(4) > dt; div:nth-child(5) > dt; div:nth-child(6) > dt; .fee-values > span:nth-child(1); .fee-values > span:nth-child(2); .fee-values > span:nth-child(3); .parent-info > dl > div:nth-child(1) > dt; .parent-info > dl > div:nth-child(2) > dt; .parent-info > dl > div:nth-child(3) > dt; button:nth-child(2) > span > small; button:nth-child(3) > span > small; .privacy > span > small |

Axe incomplete checks need human review. Four dashboard states do not establish site-wide conformance. No manual assistive-technology certification.
