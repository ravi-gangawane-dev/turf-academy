# Priority Action Plan - Turf Cricket Academy Management System

> Historical assessment: several claims below are superseded by the [verified 27 October 2026 functionality/API audit](../FUNCTIONALITY_API_AUDIT_2026-10-27.md). Do not treat this document as current deployment or feature acceptance.

## Overview
This plan organizes all outstanding issues by priority, with clear ownership, estimated effort, and dependencies. The goal is to achieve a fully API-driven architecture with no hardcoded mock data in production paths.

---

## P0 - Security, Data Loss, Broken Core Functionality

### P0-1: Remove Academy Store Hardcoded Mock Data
**Estimated Effort:** 2-3 days  
**Priority:** CRITICAL - Without this, all other fixes are undermined  
**Owner:** Senior Angular Engineer  

**Description:** 
Remove all 70+ hardcoded mock records from `AcademyStore` (parents, students, batches, coaches, enrollments, charges, notifications). Remove localStorage mock state persistence. Ensure state hydrates from empty arrays when `backend === 'supabase'`.

**Files to Modify:**
- `src/app/core/state/academy.store.ts` - Remove signals, methods, constants

**Dependencies:**
- Academy Facade must be fixed first (P0-2) so store initialization doesn't break
- Environment must have `backend: 'supabase'` and `useMockApi: false`

**Testing:**
- Run `npx ng test` - verify no failures from store removal
- Manual test: Refresh page - should show empty states, not mock data
- Manual test: Create first student - should persist to Supabase

**Risk:** LOW - Removing mock data that was never shown in production with correct config. Only affects development mode with misconfiguration.

---

### P0-2: Fix Academy Facade Initialization for Supabase Backend
**Estimated Effort:** 2-3 days  
**Priority:** CRITICAL - Facade must load real data when backend is supabase  
**Owner:** Senior Angular Engineer  

**Description:** 
Fix `AcademyFacade.initialize()` to actually load data from Supabase when `backend === 'supabase'`. Remove early returns that bypass data loading. Ensure all CRUD operations route to real API calls, not mock store.

**Files to Modify:**
- `src/app/core/state/academy.facade.ts` - Fix initialize(), remove mock branches

**Dependencies:**
- P0-1 (store removal) - facade should not depend on mock store data
- AcademyPreferencesService must be injectable and loadable

**Testing:**
- Run `npx ng test --include='**/academy-facade.spec.ts'`
- Manual test: Set backend to supabase, verify metrics load from database
- Manual test: Create record - should persist to Supabase, not localStorage

**Risk:** MEDIUM - Changes data loading flow; if Supabase connection fails, pages may show loading/error states instead of mock data. This is the correct behavior.

---

### P0-3: Remove Mock Data LocalStorage Persistence
**Estimated Effort:** 1 day  
**Priority:** CRITICAL - Mock data should not persist in localStorage  
**Owner:** Angular Engineer  

**Description:** 
Remove `MOCK_STATE_KEY`, `restoreMockState()`, `persistMockState()`, and the effect that persists state on every change from `AcademyStore`.

**Files to Modify:**
- `src/app/core/state/academy.store.ts` - Remove persistence code

**Testing:**
- Check Application > LocalStorage in browser dev tools - no `turf-academy-mock-state-v1` key
- Refresh page - state should be empty, not loaded from last session's mock data

**Risk:** LOW - Only removes localStorage persistence that was causing data sync issues.

---

## P1 - Hardcoded Production Data, Missing API Integration

### P1-1: Fix Dashboard to Use Real Supabase Data
**Estimated Effort:** 3-5 days  
**Priority:** HIGH - Dashboard KPIs must come from real database  
**Owner:** Angular Frontend Engineer  

**Description:** 
Ensure `SupabaseDashboardRepository` is used when `backend: 'supabase'`. Load academy name from `AcademyPreferencesService`. Replace all hardcoded metric values with real API data. Fix attendance trend and collection trend to use RPC `get_dashboard_analytics`.

**Files to Modify:**
- `src/app/features/dashboard/dashboard-page.ts` - Fix providers, add academy name, compute metrics from API
- `src/app/features/dashboard/dashboard-page.html` - Bind to real metrics, show empty states
- `src/core/api/supabase-dashboard.repository.ts` - Verify RPC queries work correctly
- `src/app/core/supabase/academy-preferences.service.ts` - Ensure preferences load from Supabase

**Dependencies:**
- P0-1 and P0-2 must be complete first (store and facade must not have mock data)
- Academy preferences must be loading from Supabase

**Testing:**
- Run `npx ng test --include='**/dashboard-page.spec.ts'`
- Manual test: Dashboard shows real student counts, not 22/21 hardcoded
- Manual test: Attendance trend chart shows actual data
- Manual test: Collection trend shows real fee collection data

**Risk:** MEDIUM - Dashboard is user-facing; if API returns empty, should show empty state, not hardcoded fake numbers. This is the correct behavior.

---

### P1-2: Load Academy Name from Preferences Service
**Estimated Effort:** 2 days  
**Priority:** HIGH - Academy name should not be hardcoded  
**Owner:** Angular Frontend Engineer  

**Description:** 
Replace all hardcoded 'Turf Cricket Academy' strings with data from `AcademyPreferencesService`. Load on initialization and use throughout the application.

**Files to Modify:**
- `src/app/core/supabase/academy-preferences.service.ts` - Already loads from Supabase, ensure it's injected where needed
- `src/app/features/dashboard/dashboard-page.ts` - Use preferences for hero title/subtitle
- `src/app/features/settings/academy-settings-page.html` - Already uses form control, but display should use preferences
- `src/app/core/api/mock-dashboard.repository.ts` - Remove hardcoded academy name
- `src/app/features/attendance/attendance-page.ts` - Lines 185, 250, 273 replace with preferences

**Dependencies:**
- P0-1 must be complete (preferences service must work without mock data interfering)
- Supabase backend must be operational

**Testing:**
- Manual test: Academy name matches what's stored in settings, not hardcoded
- Manual test: Changes in settings page reflect immediately on dashboard
- Manual test: All pages show same academy name (from database, not hardcoded)

**Risk:** LOW - Simply replacing string literals with computed values from a service that's already working.

---

### P1-3: Fix Student-Parent Linking to Use Real API
**Estimated Effort:** 2-3 days  
**Priority:** HIGH - Parents must link to students via real API  
**Owner:** Angular Frontend Engineer  

**Description:** 
Implement actual Supabase `student_parents` table operations in `AcademyFacade.linkStudentToParent()`. Currently sets error message instead of calling API.

**Files to Modify:**
- `src/app/core/state/academy.facade.ts` - Implement real API upsert to `student_parents`
- `src/app/core/supabase/parents.service.ts` - Verify CRUD operations work

**Dependencies:**
- P0-1 (store removal) - facade operations should not reference mock store
- RLS policies must allow the logged-in role to link parents

**Testing:**
- Manual test: Admin can link a parent to a student via UI
- Manual test: Linked parent appears in student's profile
- Manual test: Parent can only see their own children (RLS verification)

**Risk:** MEDIUM - Data relationship changes; if RLS is not properly configured, parents could see other parents' children. Requires Supabase RLS verification.

---

### P1-4: Fix Attendance Notification WhatsApp Flow
**Estimated Effort:** 2 days  
**Priority:** HIGH - WhatsApp messages should use real data  
**Owner:** Angular Frontend Engineer  

**Description:** 
Ensure `attendanceWhatsApp()` prioritizes Supabase service when backend is supabase, with minimal fallback only. Currently may use mock store data.

**Files to Modify:**
- `src/app/core/state/academy.facade.ts` - Fix attendanceWhatsApp to prioritize Supabase
- `src/app/core/services/whatsapp.service.ts` - Ensure real Supabase queries

**Dependencies:**
- P0-1 and P0-2 - must not use mock store data
- Student must have active parent linked (RLS verified)

**Testing:**
- Manual test: Check in a student, then click WhatsApp - should open with correct parent number
- Manual test: Verify correct student name, batch name appear in message
- Manual test: Test with no linked parent - should show appropriate error, not crash

**Risk:** LOW - WhatsApp web opens in new tab; delivery not verified (documented behavior). UI changes only.

---

### P1-5: Fix Fee Generation and Payment Recording
**Estimated Effort:** 3-4 days  
**Priority:** HIGH - Fees and payments must use real RPC calls  
**Owner:** Angular Frontend Engineer  

**Description:** 
Ensure `addMonthlyCharge()`, `generateMonthlyCharges()`, and `recordPayment()` always use real Supabase RPC calls, not mock state.

**Files to Modify:**
- `src/app/core/state/academy.facade.ts` - Remove mock branches in fee/payment methods
- `src/app/features/fees/fees-page.ts` - Ensure real API paths
- `src/app/core/supabase/fees-balances.service.ts` - Verify RPC implementations

**Dependencies:**
- P0-1 and P0-2 - store and facade must not route to mock data
- Supabase RPC functions must exist and be tested

**Testing:**
- Manual test: Generate monthly charges - should create records in Supabase
- Manual test: Record payment - should persist with receipt number, update balance
- Manual test: View payment ledger - should show real transactions

**Risk:** MEDIUM - Financial operations; if RPC fails, user should see error, not silent mock data. Proper error handling required.

---

### P1-6: Fix Enrollment Operations (Create, Transfer, Status)
**Estimated Effort:** 3 days  
**Priority:** HIGH - Enrollment lifecycle must use real API  
**Owner:** Angular Frontend Engineer  

**Description:** 
Ensure `enroll()`, `transferEnrollment()`, `setEnrollmentStatus()`, `reactivateEnrollment()` all use real Supabase RPC calls.

**Files to Modify:**
- `src/app/core/state/academy.facade.ts` - Remove mock branches
- `src/app/core/api/http-enrollments.repository.ts` - Verify RPC implementations

**Dependencies:**
- P0-1, P0-2 - store and facade must use real API
- Batch capacity check must query real batches table

**Testing:**
- Manual test: Create enrollment - should persist to Supabase, update batch capacity
- Manual test: Transfer enrollment - should update batch assignments
- Manual test: Reactivate paused enrollment - should work correctly

**Risk:** MEDIUM - Enrollment affects student billing, batch capacity, attendance. Proper validation and error handling required.

---

## P2 - Incomplete Filtering, Pagination, Validation

### P2-1: Ensure Backend Pagination on All Lists
**Estimated Effort:** 3-5 days  
**Priority:** MEDIUM - All list endpoints must use server-side pagination  
**Owner:** Angular Frontend Engineer  

**Description:** 
Verify all list endpoints use backend-driven pagination, search, sorting, and filtering. No client-side paginating of large datasets.

**Files to Modify:**
- `src/app/features/students/students-page.ts` - Already uses RPC with pagination ✅
- `src/app/features/parents/parents-page.ts` - Verify directory pagination
- `src/app/features/batches/batches-page.ts` - Verify listPage RPC pagination
- `src/app/features/fees/fees-page.ts` - Verify chargePage pagination
- `src/app/features/payments/payments-page.ts` - Verify ledgerPage RPC pagination
- `src/app/features/reports/reports-page.ts` - Verify report generation

**Dependencies:**
- P0-1 must be complete (no mock data interfering with API calls)

**Testing:**
- Manual test: Paginate through students - each page queries server, not client-side slice
- Manual test: Search filters - each filter resets to page 1
- Manual test: Sort column - server re-sorts, doesn't client-sort

**Risk:** LOW - Pagination changes are transparent to user; may show "loading" states initially as data fetches from server.

---

### P2-2: Verify Role-Based RLS Enforcement
**Estimated Effort:** 2-3 days  
**Priority:** MEDIUM - RLS must enforce data isolation per role  
**Owner:** Supabase/DBA + Angular Engineer  

**Description:** 
Verify Supabase RLS policies on key tables enforce:
- Parents see only their linked children
- Coaches see only assigned batches/students  
- Admin has full access
- Receptionist/other roles have appropriate limits

**Files to Modify:**
- Supabase Dashboard > Security > RLS Policies (not in source code, configured in Supabase)
- `src/app/core/auth/auth.service.ts` - May need role-based data path adjustments
- `src/app/core/state/academy.facade.ts` - Ensure role checks work with real data

**Dependencies:**
- P0-1 must be complete (real data needed to verify RLS)
- Supabase project with RLS enabled

**Testing:**
- Manual test: Log in as parent - view parent directory shows only own children
- Manual test: Log in as coach - view coach page shows only assigned batches
- Manual test: Log in as admin - full access
- Manual test: Log in as receptionist - appropriate limited access

**Risk:** HIGH - If RLS misconfigured, data leakage could occur. This is the highest risk item in the plan. Requires Supabase expert involvement.

---

### P2-3: Fix Search/Sort/Filter to Reset Pagination
**Estimated Effort:** 2 days  
**Priority:** MEDIUM - Changing filter should reset to page 1  
**Owner:** Angular Frontend Engineer  

**Description:** 
Ensure changing a filter (search, status, batch, coach) appropriately resets pagination to page 1.

**Files to Modify:**
- `src/app/features/students/students-page.ts` - Already has `createColumnFilters` that resets page ✅
- `src/app/features/batches/batches-page.ts` - Verify filter logic
- `src/app/features/fees/fees-page.ts` - Verify filter pagination reset
- `src/app/core/state/academy.facade.ts` - Any filter operations

**Dependencies:**
- P0-1 complete

**Testing:**
- Manual test: Search for a student, verify first page shows results, second page empty until scroll
- Manual test: Change status filter, page resets to 1
- Manual test: Change batch filter, page resets to 1

**Risk:** LOW - User experience improvement; may show additional "loading" states.

---

### P2-4: Fix Exports to Use Full Filtered Dataset
**Estested Effort:** 2 days  
**Priority:** MEDIUM - Exports should use filtered dataset, not just visible page  
**Owner:** Angular Frontend Engineer  

**Description:** 
Verify student export, fee export, payment export include all filtered records, not just the current page.

**Files to Modify:**
- `src/app/features/students/students-page.ts` - `exportStudents()` method - Already exports all `this.rows()` ✅
- `src/app/features/fees/fees-page.ts` - Export functionality
- `src/app/features/payments/payments-page.ts` - Export functionality

**Dependencies:**
- P0-1 complete

**Testing:**
- Manual test: Apply filter, click export - should include filtered records, not just page 1
- Manual test: Clear all filters, export - should include all records

**Risk:** LOW - Export behavior improvement; larger files if many records filtered.

---

## P3 - UI Consistency, Performance, Maintainability

### P3-1: Remove Remaining Hardcoded UI Strings
**Estimated Effort:** 2-3 days  
**Priority:** LOW - Replace any remaining hardcoded strings with data  
**Owner:** Angular Frontend Engineer  

**Description:** 
Replace any remaining hardcoded 'Turf Cricket Academy' fallback strings with `AcademyPreferencesService` data. This was partially addressed in the UI fix earlier.

**Files to Modify:**
- Multiple files with `academyName ?? 'Turf Cricket Academy'` patterns
- Already partially fixed; any remaining should be addressed

**Testing:**
- Search codebase for `'Turf Cricket Academy'` hardcoded strings
- Verify all instances are either fallbacks or from preferences service

**Risk:** LOW - Pure string replacement; no functional impact.

---

### P3-2: Performance Optimization - Debounce/Throttle API Calls
**Estimated Effort:** 2 days  
**Priority:** LOW - Ensure API calls aren't flooding server  
**Owner:** Angular Frontend Engineer  

**Description:** 
Verify search, filter, and pagination operations appropriately debounce/throttle API calls to avoid overwhelming the Supabase backend.

**Files to Modify:**
- `src/app/features/students/students-page.ts` - Search already debounced (350ms) ✅
- `src/app/features/dashboard/dashboard-page.ts` - Any rapid operations
- `src/app/features/attendance/attendance-page.ts` - Check-in may be rapid

**Dependencies:**
- P0-1, P0-2 complete

**Testing:**
- Manual test: Rapidly type in search - should debounce, not send API call on every keystroke
- Manual test: Quick pagination clicks - should batch or debounce

**Risk:** LOW - User experience improvement; may add slight delay but prevents API errors.

---

### P3-3: Update Test Fixtures for Real API Paths
**Estimated Effort:** 3-5 days  
**Priority:** MEDIUM - Tests should verify real API integration where possible  
**Owner:** QA Engineer / Angular Engineer  

**Description:** 
Update test spec files that currently configure mock API mode to instead test real API paths or properly isolate components.

**Files to Modify:**
- `src/app/core/state/academy.store.spec.ts`
- `src/app/core/state/academy.facade.spec.ts`
- `src/app/features/dashboard/dashboard-page.spec.ts`
- `src/app/features/students/students-page.spec.ts`
- `src/app/features/attendance/attendance-page.spec.ts`

**Important:** Do not remove mock mode entirely - it's needed for unit testing component isolation. But configurations should accurately reflect what's being tested.

**Testing:**
- Run full test suite: `npx ng test`
- Fix any failures from store/facade changes
- Ensure mock configurations are isolated to test files only, not production paths

**Risk:** MEDIUM - Test changes can introduce new failures if not done carefully. Best to fix tests incrementally.

---

### P3-4: Production Build Verification
**Estimated Effort:** 1 day  
**Priority:** MEDIUM - Ensure production build works correctly  
**Owner:** Angular Engineer  

**Description:** 
Run `npx ng build --configuration production` and verify:
- No errors in console
- No mock data references in final bundles
- All API calls point to correct Supabase endpoints
- Application serves correctly

**Files to Modify:**
- None - just verification step
- May need to fix any compilation errors that arise

**Testing:**
- `npx ng build --configuration production`
- Check for any error messages
- Serve build: `npx serve dist/turf-academy-ui --config=projects/turf-academy-ui/browser-config.js`
- Verify page loads and interactive elements work

**Risk:** LOW - Build verification; if errors, fix and retry.

---

### P3-5: Mobile Responsiveness Verification
**Estimated Effort:** 2 days  
**Priority:** LOW - Ensure UI works on mobile devices  
**Owner:** Frontend Engineer  

**Description:** 
Verify key pages responsive on mobile: dashboard, students, attendance check-in, fees.

**Files to Modify:**
- May need minor CSS adjustments in existing SCSS files
- No functional changes expected

**Testing:**
- Open application on mobile browser or use Chrome DevTools device toolbar
- Navigate through key workflows
- Verify touch targets are appropriate

**Risk:** LOW - UI improvement only.

---

## P4 - Documentation and Knowledge Transfer

### P4-1: Update Project Documentation
**Estimated Effort:** 2 days  
**Priority:** LOW - Keep docs current with code changes  
**Owner:** Project Lead  

**Description:** 
Update any project documentation to reflect the new API-driven architecture, removal of mock data, and configuration changes.

**Files to Modify:**
- Any README.md, ARCHITECTURE.md, or project wiki
- This Priority Action Plan itself
- API integration reports

**Testing:** 
- N/A - documentation verification

**Risk:** LOW - Documentation only.

---

### P4-2: Knowledge Transfer Session
**Estimated Effort:** 1 day  
**Priority:** LOW - Team understands new architecture  
**Owner:** Senior Angular Engineer  

**Description:** 
Hold a session with the team to explain:
- Why mock data was removed
- How the new API-driven architecture works
- How to add new features using real API calls
- Supabase RLS policies and role expectations

**Testing:** 
- Team Q&A session
- Documentation of decisions

**Risk:** LOW - Knowledge sharing only.

---

## Success Metrics

### Primary Success Criteria (Must Pass)
- [ ] No hardcoded business data in production code paths
- [ ] All dynamic screen content uses actual persisted or API-provided data
- [ ] All supported CRUD operations work against Supabase
- [ ] Dashboards display accurate database-derived metrics (not hardcoded 22/21)
- [ ] Lists use backend pagination, search, sorting, filtering (server-side)
- [ ] Role-based data isolation verified (parents see own children, etc.)
- [ ] Production build passes with no mock data references
- [ ] All applicable unit tests pass

### Secondary Success Criteria (Should Pass)
- [ ] E2E tests pass with real Supabase backend
- [ ] Mobile responsiveness verified on key workflows
- [ ] No memory leaks from API subscriptions
- [ ] Proper error states shown when API fails (not silent mock data)
- [ ] Export operations include full filtered dataset

### Tertiary Success Criteria (Nice to Have)
- [ ] Performance metrics acceptable (time to first data load)
- [ ] All edge cases handled with proper user feedback
- [ ] Team comfortable with new architecture
- [ ] Documentation updated and current

---

## Timeline Estimate

| Priority | Issue | Estimated Days | Total |
|----------|-------|----------------|-------|
| P0 | Critical fixes (store, facade, localStorage) | 4-7 days | |
| P1 | High priority (dashboard, API integration) | 13-22 days | |
| P2 | Medium priority (pagination, RLS, filters) | 10-15 days | |
| P3 | Low priority (UI, performance, tests) | 8-13 days | |
| P4 | Documentation/knowledge (docs, training) | 3 days | |
| **TOTAL** | | **38-57 days** | |

---

## Risk Summary

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Supabase connection failures | Medium | High | Show proper error/loading states, not mock data |
| RLS misconfiguration | Medium | Critical | Have Supabase expert verify policies; start with admin role only |
| Test failures from data removal | High | Medium | Fix tests incrementally; keep mock mode for component isolation |
| Developer learning curve | Medium | Medium | Pair programming, knowledge transfer session |
| Scope creep | Low | Medium | Follow this priority action plan strictly |
| Supabase RPC function issues | Medium | Medium | Test each RPC individually before integrating into flows |

---

## Immediate Next Steps (Week 1)

### Day 1-2: P0-1 and P0-2
- Remove academy store hardcoded mock data
- Fix academy facade initialization
- Verify `npx ng test` passes

### Day 3-4: P0-3
- Remove localStorage mock state persistence
- Verify no `turf-academy-mock-state-v1` in localStorage

### Day 5-7: P1-1 and P1-2
- Fix dashboard to use real Supabase data
- Load academy name from preferences
- Verify dashboard shows real metrics

### Day 8-10: P1-3 and P1-4
- Fix student-parent linking
- Fix WhatsApp notification flow
- Manual testing of both features

### Day 11-14: P1-5 and P1-6
- Fix fee generation and payment recording
- Fix enrollment operations
- Manual testing of financial and enrollment workflows

### Day 15-21: P2 Priority Items
- Verify backend pagination on all lists
- Confirm RLS enforcement
- Fix search/sort/filter pagination reset
- Fix export behaviors

### Day 22-28: P3 Priority Items
- Remove remaining hardcoded UI strings
- Performance optimization
- Update test fixtures
- Production build verification

### Day 29-30: P4 Items
- Update project documentation
- Hold knowledge transfer session

---

## Approval and Sign-Off

**Required Approvals:**
- [ ] Senior Angular Engineer - Technical feasibility
- [ ] Supabase/DBA - RLS policies and RPC functions
- [ ] QA Lead - Test plan and execution
- [ ] Project Manager - Timeline and resource allocation

**Sign-off Criteria:**
- All P0 items complete and tested
- P1-1, P1-2, P1-3 critical path items complete
- Production build passes with no errors
- Manual testing confirms core workflows (CRUD, check-in, payments) work against Supabase
- Team members briefed on new architecture

---
*Priority Action Plan generated on October 25, 2026. This plan should be reviewed and updated as items are completed.*