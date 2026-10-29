# Full Project Audit Report - Turf Cricket Academy Management System

> Historical assessment: several claims below are superseded by the [verified 27 October 2026 functionality/API audit](../FUNCTIONALITY_API_AUDIT_2026-10-27.md). Do not treat this document as current deployment or feature acceptance.

## Audit Overview
- **Project Type**: Angular 17+ frontend with Supabase backend
- **Total Files Audited**: ~150+ files across frontend, services, stores, repositories
- **Audit Date**: October 25, 2026
- **Status**: ⚠️ **PARTIALLY WORKING** - Critical hardcoded data issues require fixes

---

## Module Audit Summary

| Module | Feature | Status | Priority | Issue | File | Recommended Fix |
|--------|---------|--------|----------|-------|------|-----------------|
| **Students** | Student list, details, forms | 🟡 Partially Working | P1 | Metrics loaded from hardcoded mock store; real API calls exist but facade bypasses them | `src/app/core/state/academy.facade.ts`, `src/app/core/state/academy.store.ts` | Replace mock store data loading with real Supabase API calls; ensure facade initialization loads from backend |
| **Parents** | Parent directory, profiles, linked children | 🟡 Partially Working | P1 | Parent data loaded from mock store; real Supabase queries exist in service but facade uses mock | `src/app/core/state/academy.store.ts`, `src/app/core/state/academy.facade.ts` | Load parent records from Supabase when backend is supabase; remove mock data fallback |
| **Batches** | Batch list, creation, editing | 🟡 Partially Working | P1 | Batch data loaded from mock store; real API calls in service but facade bypasses them | `src/app/core/state/academy.store.ts`, `src/app/core/state/academy.facade.ts` | Replace mock batch data with real Supabase queries; ensure facade uses backend data |
| **Coaches** | Coach list, details, specializations | 🟡 Partially Working | P1 | Coach data loaded from mock store; real API calls exist but facade uses mock | `src/app/core/state/academy.store.ts`, `src/app/core/state/academy.facade.ts` | Load coach records from Supabase; remove mock data persistence |
| **Enrollments** | Enrollment lifecycle, transfers, status changes | 🟡 Partially Working | P1 | Enrollment data loaded from mock store; real RPC calls exist but facade bypasses them | `src/app/core/state/academy.store.ts`, `src/app/core/state/academy.facade.ts` | Replace mock enrollment data with real Supabase queries via RPC |
| **Attendance** | Check-in/out, history, corrections | 🟡 Partially Working | P1 | Attendance data can come from mock or Supabase; mixed implementation | `src/app/core/state/academy.facade.ts`, `src/app/core/api/supabase-attendance.repository.ts` | Standardize on Supabase backend; ensure facade always uses Supabase for attendance |
| **Fees** | Monthly charges, payments, discounts | 🟡 Partially Working | P1 | Fee data loaded from mock store; real API calls in service but facade uses mock | `src/app/core/state/academy.store.ts`, `src/app/core/state/academy.facade.ts` | Load fee/charge data from Supabase; remove mock data fallback |
| **Payments** | Payment recording, ledger, history | 🟡 Partially Working | P1 | Payment data loaded from mock store; real RPC calls exist but facade bypasses them | `src/app/core/state/academy.store.ts`, `src/app/core/state/academy.facade.ts` | Replace mock payment data with real Supabase queries |
| **Notifications** | WhatsApp notifications, email, SMS | 🟡 Partially Working | P1 | Notification data loaded from mock store; real service exists but facade uses mock | `src/app/core/state/academy.store.ts`, `src/app/core/state/academy.facade.ts` | Load notifications from Supabase; remove mock data persistence |
| **Dashboard** | KPIs, charts, recent activity | 🟡 Partially Working | P1 | Dashboard metrics from mock store; real API calls in repository but facade bypasses them | `src/app/core/state/academy.facade.ts`, `src/app/core/api/supabase-dashboard.repository.ts` | Ensure dashboard loads from real Supabase analytics and preferences |
| **Academy Settings** | Academy profile, configuration | 🟢 Working | P0 | Uses real API service (AcademySettingsService) with Supabase; UI fixes needed for autocomplete/dropdown | `src/app/features/settings/academy-settings-page.html`, `src/app/features/settings/academy-settings-page.scss` | UI enhancements only - data already comes from real API |

---

## Critical Issues Found

### 1. Academy Store Hardcoded Mock Data (SEVERITY: CRITICAL)
The `AcademyStore` class maintains 70+ hardcoded mock records for parents, students, batches, coaches, enrollments, charges, and notifications. This data:
- Is persisted in `localStorage` under key `turf-academy-mock-state-v1`
- Is restored on every app start via `restoreMockState()`
- Bypasses all real Supabase API calls when `useMockApi` is false but `backend` is not 'supabase'
- Creates inconsistent data state across the application

**Affected Files:**
- `src/app/core/state/academy.store.ts` - Lines 42-449: Mock state persistence
- `src/app/core/state/academy.facade.ts` - Lines 73, 93, 126, 140, 148, 155, 162, 167, 174, 181, 188, 195, 202, 215, 224, 231, 238, 245: Facade conditional checks that route to mock data

### 2. Academy Facade Initialization Bug (SEVERITY: CRITICAL)
The `AcademyFacade.initialize()` method has a bug:
- When `backend === 'supabase'`, it returns early without loading any data from Supabase
- When `useMockApi` is true, it also returns early
- This means the state is never populated from the real backend

**Affected File:**
- `src/app/core/state/academy.facade.ts` - Lines 73, 93: `if (this.initialized || this.config.useMockApi) return;` and `if (this.config.backend === 'supabase') return;`

### 3. Mixed Data Sources
The application uses a hybrid approach:
- Mock data from `AcademyStore` when `useMockApi: true` or certain backend conditions
- Real Supabase data when `backend: 'supabase'` and `useMockApi: false`
- HTTP API calls when `backend: 'rest'`

This causes inconsistent UI behavior depending on the configuration.

### 4. Dashboard Metrics from Mock Data
The dashboard displays metrics from the mock store rather than real API data:
- Active students count, present today, pending fees, etc. all come from hardcoded mock data
- Real Supabase repositories exist (`supabase-dashboard.repository.ts`) but are not used consistently

**Affected File:**
- `src/app/features/dashboard/dashboard-page.ts` - Uses `DASHBOARD_REPOSITORY` which may route to mock data

### 5. Attendance Page Hardcoded Academy Name
Multiple pages hardcode 'Turf Cricket Academy' instead of reading from persisted settings:
- `src/app/features/attendance/attendance-page.ts` - Lines 185, 250, 273
- `src/app/core/api/mock-dashboard.repository.ts` - Line 17

---

## Hardcoded Data Summary

| Data Type | Files Affected | Severity |
|-----------|----------------|----------|
| Parent records (10 parents) | `academy.store.ts` | CRITICAL |
| Student records (10 students + QA test) | `academy.store.ts` | CRITICAL |
| Batch records (3 batches) | `academy.store.ts` | CRITICAL |
| Coach records (6 coaches) | `academy.store.ts` | CRITICAL |
| Enrollment records (10 enrollments) | `academy.store.ts` | CRITICAL |
| Fee charges (1 charge) | `academy.store.ts` | CRITICAL |
| Payment records (0) | `academy.store.ts` | CRITICAL |
| Notification logs (4 notifications) | `academy.store.ts` | CRITICAL |
| Dashboard metrics | `dashboard-page.ts`, `mock-dashboard.repository.ts` | HIGH |
| Academy name strings | Multiple files | MEDIUM |
| KPI values (22 students, 21 active) | `dashboard-page.html` | MEDIUM |

---

## API Integration Status

| Screen/Feature | Data Source | Real Data | CRUD | Backend Pagination | RLS | Status |
|----------------|-------------|-----------|------|-------------------|-----|--------|
| Students list | Supabase RPC `get_student_list_page` | ✅ Yes | ✅ Create/Update/Delete | ✅ Server-side | ✅ Enforced | ⚠️ Mock data bypasses it |
| Parents directory | Supabase queries | ✅ Yes | ✅ Create/Update/Link/Delete | ✅ Server-side with export | ✅ Enforced | ⚠️ Mock data bypasses it |
| Batches list | Supabase queries | ✅ Yes | ✅ Create/Update/Delete | ✅ Server-side with filters | ✅ Enforced | ⚠️ Mock data bypasses it |
| Coaches list | Supabase queries | ✅ Yes | ✅ Create/Update | ✅ Server-side | ✅ Enforced | ⚠️ Mock data bypasses it |
| Enrollments | Supabase RPC `create_enrollment`, `change_enrollment_status` | ✅ Yes | ✅ Create/Status Transfer | ✅ Server-side | ✅ Enforced | ⚠️ Mock data bypasses it |
| Attendance | Supabase RPC `attendance_check_in`, `attendance_check_out`, `get_attendance_workspace_page` | ✅ Yes | ✅ Check-in/Check-out | ✅ Server-side paginated | ✅ Enforced | ⚠️ Mixed mock/Supabase |
| Fees/charges | Supabase RPC `generate_monthly_charges`, `get_fee_charge_summary` | ✅ Yes | ✅ Generate/Record | ✅ Server-side | ✅ Enforced | ⚠️ Mock data bypasses it |
| Payments | Supabase RPC `record_payment` | ✅ Yes | ✅ Record payment | ✅ Server-side | ✅ Enforced | ⚠️ Mock data bypasses it |
| Notifications | Supabase queries + RPC | ✅ Yes | ✅ Send WhatsApp | ✅ Server-side | ⚠️ Partial | Mock data in store |
| Dashboard summary | Supabase RPC `get_dashboard_analytics` + preferences | ✅ Yes | N/A | ✅ Server-side | ✅ Enforced | ⚠️ Mock data in store |
| Academy Settings | Supabase `academy_settings` table | ✅ Yes | ✅ Save/Load | N/A | ✅ Enforced | ✅ Working |

---

## Fix Implementation Plan

### Phase 1: Fix Academy Store (P0 - Critical)
1. Remove all hardcoded mock state initialization from `academy.store.ts`
2. Remove `localStorage` mock state persistence
3. Implement real Supabase data loading when `backend === 'supabase'`
4. Remove mock data fallback in all computed properties

### Phase 2: Fix Academy Facade (P0 - Critical)
1. Fix `initialize()` to load data from Supabase when `backend === 'supabase'`
2. Remove early returns that bypass data loading
3. Ensure all feature services use real backend data
4. Add proper error handling for API failures

### Phase 3: Fix Dashboard (P1 - High)
1. Ensure dashboard uses `SupabaseDashboardRepository` by default
2. Load academy name from preferences service
3. Replace hardcoded metric values with real API data

### Phase 4: Remove Hardcoded Strings (P2 - Medium)
1. Replace all hardcoded 'Turf Cricket Academy' with `AcademyPreferencesService`
2. Load academy name from database on initialization

### Phase 5: Testing (P1 - High)
1. Update all spec files to test real API paths
2. Remove mock provider configurations where real API is used
3. Verify production build works with Supabase backend

---

## Priority Action Plan

### P0 - Security & Core Functionality
- [ ] Fix academy store to use real Supabase data
- [ ] Fix academy facade initialization for Supabase backend
- [ ] Remove mock data persistence from localStorage
- [ ] Ensure all CRUD operations use real API calls

### P1 - Hardcoded Production Data
- [ ] Replace all hardcoded metric values with real API data
- [ ] Load academy name from preferences service
- [ ] Replace mock dashboard data with real Supabase analytics
- [ ] Fix attendance data to consistently use Supabase

### P2 - API Integration & Pagination
- [ ] Ensure all lists use backend pagination
- [ ] Verify role-based RLS is enforced consistently
- [ ] Fix search/sort/filter to use server-side processing
- [ ] Ensure exports use full filtered dataset

### P3 - UI Consistency & Maintenance
- [ ] Remove any remaining hardcoded UI strings
- [ ] Ensure design system consistency
- [ ] Update tests to match real API behavior
- [ ] Production build verification

---

## Success Criteria

The application is ready only when:
- ✅ No hardcoded business data remains in production paths
- ✅ All dynamic screen content uses actual persisted or API-provided data
- ✅ All supported CRUD operations work against Supabase
- ✅ Dashboards display accurate database-derived metrics
- ✅ Lists use appropriate backend pagination, search, sorting, and filtering
- ✅ Role-based data isolation is verified
- ✅ No fake success messages are shown for failed operations
- ✅ Production build and applicable tests pass
- ✅ Remaining limitations are explicitly documented