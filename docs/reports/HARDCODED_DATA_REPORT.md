# Hardcoded Data Report - Turf Cricket Academy Management System

> Historical assessment: several claims below are superseded by the [verified 27 October 2026 functionality/API audit](../FUNCTIONALITY_API_AUDIT_2026-10-27.md). Do not treat this document as current deployment or feature acceptance.

## Executive Summary
This report identifies all hardcoded, mock, fake, or dummy data findings in the production code paths of the Turf Cricket Academy Management System. The application currently uses a hybrid architecture with mock data that bypasses real Supabase API calls, causing inconsistent behavior.

---

## Category 1: Academy Store Mock Data (SEVERITY: CRITICAL)

### 1.1 Hardcoded Parent Records
**File:** `src/app/core/state/academy.store.ts`  
**Lines:** 44-131  
**Data:** 10 parent records with full names, mobile numbers, WhatsApp numbers, and relations

```typescript
private readonly parentsState = signal<readonly Parent[]>([
  {
    id: 'parent-1',
    name: 'Mahesh Patil',
    mobile: '9876543210',
    whatsapp: '9876543210',
    relation: 'Father',
  },
  // ... parent-2 through parent-10
]);
```

**Impact:** Parent records are never loaded from Supabase `parents` table when backend is configured.  
**Fix Required:** Load parents from Supabase `get parents()` query; remove mock state persistence.

### 1.2 Hardcoded Student Records
**File:** `src/app/core/state/academy.store.ts`  
**Lines:** 133-237  
**Data:** 10 student records with parent IDs, names, dates of birth, skill levels, and statuses

```typescript
private readonly studentsState = signal<readonly Student[]>([
  {
    id: 'student-1',
    parentId: 'parent-1',
    name: 'Rohan Patil',
    dateOfBirth: '2012-05-14',
    skillLevel: 'Intermediate',
    status: 'active',
  },
  // ... student-2 through student-10
  // QA test student
  {
    id: 'qa-camera-student',
    parentId: 'parent-1',
    name: 'QA Camera Test Student',
    dateOfBirth: '2012-05-14',
    skillLevel: 'Beginner',
    status: 'active',
  },
]);
```

**Impact:** Student records bypass Supabase `students` table. The `qa-camera-student` should not be in production code.  
**Fix Required:** Remove hardcoded students; load from Supabase `get students()` query. Remove QA test student from production code.

### 1.3 Hardcoded Batch Records
**File:** `src/app/core/state/academy.store.ts`  
**Lines:** 239-278  
**Data:** 3 batch records with names, schedules, capacities, and fees

```typescript
private readonly batchesState = signal<readonly Batch[]>([
  {
    id: 'batch-1',
    name: 'Morning Pro',
    schedule: 'Mon–Sat · 6:00–8:00 AM',
    capacity: 25,
    monthlyFeePaise: 250000,
    coachId: 'coach-1',
  },
  // ... batch-2, batch-3
]);
```

**Impact:** Batch data never comes from Supabase `batches` table.  
**Fix Required:** Load batches from Supabase `get batches()` query.

### 1.4 Hardcoded Coach Records
**File:** `src/app/core/state/academy.store.ts`  
**Lines:** 280-337  
**Data:** 6 coach records with names, mobiles, specializations, and statuses

```typescript
private readonly coachesState = signal<readonly Coach[]>([
  {
    id: 'coach-1',
    name: 'Rahul Deshmukh',
    mobile: '9822133445',
    specialization: 'Batting Coach',
    status: 'active',
  },
  // ... coach-2 through coach-6
]);
```

**Impact:** Coach records bypass Supabase `coaches` table.  
**Fix Required:** Load coaches from Supabase `get coaches()` query.

### 1.5 Hardcoded Enrollment Records
**File:** `src/app/core/state/academy.store.ts`  
**Lines:** 339-412  
**Data:** 10 enrollment records linking students to batches with start/due dates and fees

```typescript
private readonly enrollmentsState = signal<readonly Enrollment[]>([
  {
    id: 'enrollment-1',
    studentId: 'student-1',
    batchId: 'batch-2',
    startDate: '2026-08-01',
    dueDate: '2026-08-05',
    monthlyFeePaise: 250000,
    status: 'active',
  },
  // ... enrollment-2 through enrollment-10
  // QA enrollment
  {
    id: 'enrollment-qa-camera',
    studentId: 'qa-camera-student',
    batchId: 'batch-1',
    startDate: '2026-10-14',
    dueDate: '2026-10-14',
    monthlyFeePaise: 250000,
    status: 'active',
  },
]);
```

**Impact:** Enrollment data bypasses Supabase `enrollments` table. QA enrollment should be removed.  
**Fix Required:** Load enrollments from Supabase via RPC `get enrollments()` or query directly.

### 1.6 Hardcoded Fee Charges
**File:** `src/app/core/state/academy.store.ts`  
**Lines:** 414-424  
**Data:** 1 fee charge record

```typescript
private readonly chargesState = signal<readonly FeeCharge[]>([
  {
    id: 'charge-1',
    studentId: 'student-1',
    enrollmentId: 'enrollment-1',
    period: 'August 2026',
    amountPaise: 250000,
    dueDate: '2026-08-05',
  },
]);
```

**Impact:** Fee charge data never comes from Supabase `monthly_charges` table.  
**Fix Required:** Load charges from Supabase via RPC or direct queries.

### 1.7 Hardcoded Payment Records
**File:** `src/app/core/state/academy.store.ts`  
**Lines:** 426-432  
**Data:** Empty payment state signal

```typescript
private readonly paymentsState = signal<readonly Payment[]>([]);
```

**Impact:** Payments are tracked in mock store only; real payments use Supabase RPC.  
**Fix Required:** Remove mock payment state; use real Supabase payment recording.

### 1.8 Hardcoded Notification Logs
**File:** `src/app/core/state/academy.store.ts`  
**Lines:** 434-452  
**Data:** 4 notification records with student IDs, types, recipients, and statuses

```typescript
private readonly notificationsState = signal<readonly NotificationLog[]>([
  {
    id: 'notification-1',
    studentId: 'student-1',
    type: 'check-in',
    recipientName: 'Mahesh Patil',
    recipientMobile: '9876543210',
    channel: 'whatsapp',
    status: 'delivered',
    createdAt: '2026-08-07T06:18:00+05:30',
  },
  // ... notification-2 through notification-4
]);
```

**Impact:** Notification data bypasses real WhatsApp/service notifications.  
**Fix Required:** Load notifications from Supabase or generate from actual attendance/payment events.

---

## Category 2: Dashboard Hardcoded Metrics (SEVERITY: HIGH)

### 2.1 Hardcoded Student Counts
**File:** `src/app/features/dashboard/dashboard-page.html`  
**Lines:** Various KPI card bindings

```html
<app-summary-metric-card label="Total students" [value]="metrics().total" ... />
<app-summary-metric-card label="Active students" [value]="metrics().active" ... />
<app-summary-metric-card label="Inactive students" [value]="metrics().inactive" ... />
<app-summary-metric-card label="New this month" [value]="metrics().newThisMonth" ... />
<app-summary-metric-card label="Graduated" [value]="metrics().graduated" ... />
```

**Source:** These values come from `academy.store` mock data, not real database queries.  
**Fix Required:** Use `SupabaseDashboardRepository.getSummary()` which queries real Supabase tables.

### 2.2 Hardcoded Academy Name
**File:** `src/core/api/mock-dashboard.repository.ts`  
**Line:** 17  
**Data:** `academyName: 'Turf Cricket Academy'`  

**File:** `src/app/features/attendance/attendance-page.ts`  
**Lines:** 185, 250, 273  
**Data:** `academyName: 'Turf Cricket Academy'`  

**Impact:** Academy name is hardcoded instead of being loaded from `academy_preferences` or `academy_settings` table.  
**Fix Required:** Load academy name from Supabase `academy_preferences` table or `academy_settings` via the `AcademyPreferencesService`.

### 2.3 Mock Dashboard Repository
**File:** `src/core/api/mock-dashboard.repository.ts`  
**Status:** Complete mock implementation that generates all metrics artificially.

**Impact:** When `useMockApi: true`, all dashboard metrics come from this mock, not real data.  
**Fix Required:** Ensure production configuration uses `backend: 'supabase'` and `useMockApi: false`.

---

## Category 3: Hardcoded API Configuration (SEVERITY: MEDIUM)

### 3.1 Mock API Configuration in Environment
**File:** `src/environments/environment.ts`  
**Data:** 
```typescript
useMockApi: false,  // Currently set to false in development
backend: 'supabase' as const,
```

**Impact:** Development environment correctly disables mock mode, but the codebase still contains extensive mock data fallback paths that could be triggered.

**Fix Required:** Ensure `useMockApi: false` and `backend: 'supabase'` are maintained in all environments.

### 3.2 Hardcoded Academy Support Values
**File:** `src/environments/environment.ts`  
**Data:** Academy support contact information
```typescript
academySupport: {
  phone: '+919876543210',
  displayPhone: '+91 98765 43210',
  email: 'support@turfacademy.in',
  whatsapp: '919876543210',
  hours: 'Mon–Sat, 8:00 AM–7:00 PM',
},
```

**Impact:** These are environment-level configuration values, not business data. They are acceptable as static config.

**Fix Required:** No change needed - these are legitimate static UI configuration values per the audit guidelines.

---

## Category 4: UI-Level Hardcoded Values (SEVERITY: LOW)

### 4.1 Academy Name Strings
**Files Mentioned:**
- `src/app/core/services/whatsapp.service.ts` - Line 25: `(data.academyName ?? 'Turf Cricket Academy')`
- `src/app/core/supabase/academy-preferences.service.ts` - Lines 25-26: Default values
- `src/app/features/settings/academy-settings-page.ts` - Lines 39, 68, 200
- `src/app/features/payments/receipt-pdf.ts` - Line 17

**Impact:** Falls back to 'Turf Cricket Academy' when API returns null/undefined. This is acceptable as a default fallback value.

**Fix Required:** No change needed - these are legitimate static fallback values per audit guidelines.

### 4.2 KPI Numeric Values (Pre-Audit)
**File:** `src/app/features/dashboard/dashboard-page.html`  
**Data:** Previously showed `totalStudents = 22`, `activeStudents = 21` as hardcoded values.

**Status:** These were removed in the current codebase - metrics now come from the store/metrics object.

**Fix Required:** Already addressed - metrics now derived from state.

---

## Category 5: Test Fixture Data (SEVERITY: INFO - Not Production Code)

### 5.1 Spec File Mocks
**Files:** Various `*.spec.ts` files  
**Data:** Vi.mock() calls, mockResolvedValue, mockRejectedValue

**Impact:** Test fixtures use mocks to isolate components from services. This is expected and should remain in test files only.

**Fix Required:** Do not modify test fixtures. They isolate production code for testing. The real API integration should be verified through end-to-end tests or manual testing.

### 5.2 Mock API Configuration for Testing
**Files:** `academy-facade.spec.ts`, `academy-store.spec.ts`, various other spec files  
**Data:** `provide: API_CONFIG, useValue: { baseUrl: '/api/v1', useMockApi: true, backend: 'mock' }`

**Impact:** Tests intentionally use mock mode to test component behavior without Supabase dependency. This is correct practice.

**Fix Required:** Do not modify test configurations. Keep mock mode for testing only.

---

## Resolution Status Summary

| Category | Total Issues | Fixed | Remaining | Priority |
|----------|-------------|-------|-----------|----------|
| Academy Store Mock Data | 8 types | 0 | 8 | P0 - CRITICAL |
| Dashboard Metrics | 3 issues | 0 | 3 | P1 - HIGH |
| API Configuration | 2 issues | 0 | 2 | P2 - MEDIUM |
| UI Hardcoded Values | 4 issues | 1 (academy name fallback) | 3 | P2 - MEDIUM |
| Test Fixtures | 2 issues | N/A | 2 | Info |

---

## Immediate Actions Required

### P0 - Fix Academy Store (Estimated: 2-3 days)
1. Remove `parentsState` signal initialization with 10 hardcoded parents
2. Remove `studentsState` signal initialization with 10+ hardcoded students
3. Remove `batchesState` signal initialization with 3 hardcoded batches
4. Remove `coachesState` signal initialization with 6 hardcoded coaches
5. Remove `enrollmentsState` signal initialization with 10+ hardcoded enrollments
6. Remove `chargesState` signal initialization with hardcoded charges
7. Remove `paymentsState` signal (use real Supabase payments)
8. Remove `notificationsState` signal (generate from real events)
9. Remove `MOCK_STATE_KEY` localStorage persistence
10. Remove `restoreMockState()` and `persistMockState()` methods
11. Remove `id()` private method (generates sequential IDs)
12. Remove `sequence` counter

### P0 - Fix Academy Facade (Estimated: 2-3 days)
1. Fix `initialize()` method to load data from Supabase when `backend === 'supabase'`
2. Remove early returns that bypass data loading
3. Ensure `refresh()` loads from real API when not using mock
4. Ensure `loadAttendanceWorkspace()` works with Supabase backend
5. Ensure all CRUD operations route to real API when `useMockApi: false`

### P1 - Fix Dashboard Metrics (Estimated: 3-5 days)
1. Ensure `SupabaseDashboardRepository` is used by default
2. Load academy name from `AcademyPreferencesService`
3. Replace `metrics().total`, `metrics().active`, etc. with real API data
4. Ensure attendance trend and collection trend come from real RPC calls

### P1 - Remove Hardcoded Academy Name (Estimated: 2 days)
1. Load academy name from `AcademyPreferencesService` on page init
2. Replace all `academyName: 'Turf Cricket Academy'` fallbacks with real data
3. Ensure settings service populates preferences on application startup

---

## Files Requiring Modification

### Critical Path (P0):
1. `src/app/core/state/academy.store.ts` - Remove all mock data, keep only API integration methods
2. `src/app/core/state/academy.facade.ts` - Fix initialization, route all operations to real API
3. `src/app/core/supabase/academy-preferences.service.ts` - Ensure preferences load from Supabase

### High Priority (P1):
4. `src/app/features/dashboard/dashboard-page.ts` - Use real dashboard repository
5. `src/app/features/dashboard/dashboard-page.html` - Bind to real metrics
6. `src/core/api/mock-dashboard.repository.ts` - Deprecate or mark for removal
7. `src/app/features/attendance/attendance-page.ts` - Replace hardcoded academy name

### Medium Priority (P2):
8. `src/environments/environment.ts` - Verify `useMockApi: false`, `backend: 'supabase'`
9. Multiple files with `academyName ?? 'Turf Cricket Academy'` fallbacks (acceptable)

### Low Priority:
10. Test spec files - do not modify (keep mock mode for testing)
11. Environment configuration values (acceptable as static config)