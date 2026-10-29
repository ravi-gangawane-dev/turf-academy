# Missing implementation and tooling gaps

Audit date: 21 October 2026. **Audit only: no fixes or business-data changes during the audit.** Prior authorized attendance E2E evidence is identified separately.

| ID | Module | Capability | Evidence | Priority |
| --- | --- | --- | --- | --- |
| F133 | Testing | Colocated spec for every component | 43 of 69 components have no colocated spec, against requested audit standard; indirect coverage may exist. | P2 |
| F134 | Tooling | Configured project lint command | package.json has no lint script; development-tooling gap. | P3 |

| Module | Missing feature | Expected behavior / basis | Recommended implementation | Priority |
| --- | --- | --- | --- | --- |
| Components | 43 colocated spec files | User requested every-component structural audit; indirect coverage may exist | Prioritize behavioral tests for permissions, consent, dates and persistence failures | P2 |
| Tooling | Project lint command | Requested lint check has no package script | Add compatible Angular/TypeScript lint setup and CI command | P3 |

No additional missing business requirement is asserted. UI backup restoration and provider delivery tracking are optional scope decisions, not established required omissions. URL opening cannot supply a delivery receipt. Seventeen inline templates violate the requested separate-file convention but are implemented components, classified as maintainability improvements. Modern filenames without .component are not runtime defects.
