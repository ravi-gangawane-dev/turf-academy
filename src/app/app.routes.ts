import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { permissionGuard } from './core/auth/permission.guard';
import { roleGuard } from './core/auth/role.guard';
import { notificationRedirect } from './features/notifications/notification-query';

const designSystemPage = () =>
  import('./features/system/design-system-page').then((m) => m.DesignSystemPage);
const developerHandoffPage = () =>
  import('./features/system/developer-handoff-page').then((m) => m.DeveloperHandoffPage);
const authUtilityPage = () =>
  import('./features/auth/auth-utility-page').then((m) => m.AuthUtilityPage);
const roleRedirectPage = () =>
  import('./features/auth/role-redirect-page').then((m) => m.RoleRedirectPage);
const parentPortalPage = () =>
  import('./features/parents/parent-portal-page').then((m) => m.ParentPortalPage);
const coachPortalPage = () =>
  import('./features/coach/coach-portal-page').then((m) => m.CoachPortalPage);
const paymentsPage = () => import('./features/payments/payments-page').then((m) => m.PaymentsPage);
const academySettingsPage = () =>
  import('./features/settings/academy-settings-page').then((m) => m.AcademySettingsPage);
const feeOperationsPage = () =>
  import('./features/fees/fee-operations-page').then((m) => m.FeeOperationsPage);
const reportsPage = () => import('./features/reports/reports-page').then((m) => m.ReportsPage);
const notificationTemplatesPage = () =>
  import('./features/notifications/notification-templates-page').then(
    (m) => m.NotificationTemplatesPage,
  );
const academyEventsPage = () =>
  import('./features/notifications/academy-events-page').then((m) => m.AcademyEventsPage);

export const routes: Routes = [
  // Public entry points and authentication flows.
  { path: '', redirectTo: 'auth/splash', pathMatch: 'full' },
  {
    path: 'auth/splash',
    loadComponent: () => import('./features/auth/auth-splash-page').then((m) => m.AuthSplashPage),
  },
  { path: 'login', redirectTo: 'auth/login', pathMatch: 'full' },
  {
    path: 'auth/login',
    title: 'Sign in · Turf Academy',
    loadComponent: () => import('./features/auth/login-page').then((m) => m.LoginPage),
  },
  {
    path: 'unauthorized',
    title: 'Access denied · Turf Academy',
    loadComponent: () =>
      import('./features/auth/unauthorized-page').then((m) => m.UnauthorizedPage),
  },
  {
    path: 'auth/forgot-password',
    data: {
      title: 'Forgot Password',
      description: 'Enter the email address linked to your academy account.',
    },
    loadComponent: authUtilityPage,
  },
  {
    path: 'auth/reset-password',
    data: {
      title: 'Reset Password',
      kind: 'password',
      description: 'Choose a new secure password.',
    },
    loadComponent: authUtilityPage,
  },
  {
    path: 'auth/otp',
    data: {
      title: 'OTP Verification',
      kind: 'otp',
      description: 'Enter your recovery verification code.',
    },
    loadComponent: authUtilityPage,
  },
  {
    path: 'auth/session-expired',
    data: {
      title: 'Session Expired',
      description: 'Your session ended. Return to sign in or verify your account.',
    },
    loadComponent: authUtilityPage,
  },
  {
    path: 'auth/password-updated',
    data: {
      title: 'Password Updated!',
      kind: 'success',
      description: 'Your password has been successfully updated.',
    },
    loadComponent: authUtilityPage,
  },
  {
    path: 'redirect/admin',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin'], label: 'Admin', tagline: 'Lead Manage Grow', icon: 'pi pi-crown' },
    loadComponent: roleRedirectPage,
  },
  {
    path: 'redirect/coach',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['coach'], label: 'Coach', tagline: 'Coach Guide Inspire', icon: 'pi pi-users' },
    loadComponent: roleRedirectPage,
  },
  {
    path: 'redirect/reception',
    canActivate: [authGuard, roleGuard],
    data: {
      roles: ['receptionist'],
      label: 'Receptionist',
      tagline: 'Organize Support Keep It Going',
      icon: 'pi pi-headphones',
    },
    loadComponent: roleRedirectPage,
  },
  {
    path: 'redirect/parent',
    canActivate: [authGuard, roleGuard],
    data: {
      roles: ['parent'],
      label: 'Parent',
      tagline: 'Support Their Journey Every Step',
      icon: 'pi pi-users',
    },
    loadComponent: roleRedirectPage,
  },
  // Authenticated application shell. Keep role-specific portals before staff routes.
  {
    path: '',
    canActivate: [authGuard],
    canActivateChild: [permissionGuard],
    loadComponent: () => import('./layout/staff-layout/staff-layout').then((m) => m.StaffLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      // Coach portal.
      {
        path: 'coach/dashboard',
        canActivate: [roleGuard],
        data: { roles: ['coach'], permission: 'coach:portal', view: 'dashboard' },
        loadComponent: coachPortalPage,
      },
      {
        path: 'coach/batches',
        canActivate: [roleGuard],
        data: { roles: ['coach'], permission: 'coach:portal', view: 'batches' },
        loadComponent: coachPortalPage,
      },
      {
        path: 'coach/batches/:batchId',
        canActivate: [roleGuard],
        data: { roles: ['coach'], permission: 'coach:portal', view: 'batch' },
        loadComponent: coachPortalPage,
      },
      {
        path: 'coach/students',
        canActivate: [roleGuard],
        data: { roles: ['coach'], permission: 'coach:portal', view: 'students' },
        loadComponent: coachPortalPage,
      },
      {
        path: 'coach/students/:studentId',
        canActivate: [roleGuard],
        data: { roles: ['coach'], permission: 'coach:portal', view: 'student' },
        loadComponent: coachPortalPage,
      },
      {
        path: 'coach/attendance',
        canActivate: [roleGuard],
        data: { roles: ['coach'], permission: 'coach:portal', view: 'attendance' },
        loadComponent: coachPortalPage,
      },
      {
        path: 'coach/attendance/check-in-out',
        canActivate: [roleGuard],
        data: { roles: ['coach'], permission: 'coach:portal', view: 'check-in-out' },
        loadComponent: coachPortalPage,
      },
      // The old fragmented coach attendance URLs keep working and land on the
      // unified hardened view (mirrors the staff /attendance/* redirects).
      {
        path: 'coach/attendance/qr',
        redirectTo: 'coach/attendance/check-in-out',
        pathMatch: 'full',
      },
      {
        path: 'coach/attendance/check-in',
        redirectTo: 'coach/attendance/check-in-out',
        pathMatch: 'full',
      },
      {
        path: 'coach/attendance/check-out',
        redirectTo: 'coach/attendance/check-in-out',
        pathMatch: 'full',
      },
      {
        path: 'coach/attendance/history',
        canActivate: [roleGuard],
        data: { roles: ['coach'], permission: 'coach:portal', view: 'history' },
        loadComponent: coachPortalPage,
      },
      {
        path: 'coach/attendance/correction',
        canActivate: [roleGuard],
        data: { roles: ['coach'], permission: 'coach:portal', view: 'correction' },
        loadComponent: coachPortalPage,
      },
      {
        path: 'coach/attendance/summary',
        canActivate: [roleGuard],
        data: { roles: ['coach'], permission: 'coach:portal', view: 'summary' },
        loadComponent: coachPortalPage,
      },
      {
        path: 'coach/schedule',
        canActivate: [roleGuard],
        data: { roles: ['coach'], permission: 'coach:portal', view: 'schedule' },
        loadComponent: coachPortalPage,
      },
      {
        path: 'coach/notifications',
        canActivate: [roleGuard],
        data: { roles: ['coach'], permission: 'coach:portal', view: 'notifications' },
        loadComponent: coachPortalPage,
      },
      {
        path: 'coach/profile',
        canActivate: [roleGuard],
        data: { roles: ['coach'], permission: 'coach:portal', view: 'profile' },
        loadComponent: coachPortalPage,
      },
      {
        path: 'coach/support',
        canActivate: [roleGuard],
        data: { roles: ['coach'], permission: 'coach:portal', view: 'support' },
        loadComponent: coachPortalPage,
      },
      // Role-specific dashboards and parent portal.
      {
        path: 'dashboard/admin',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
        title: 'Admin Dashboard · Turf Academy',
        loadComponent: () =>
          import('./features/dashboard/dashboard-page').then((m) => m.DashboardPage),
      },
      {
        path: 'dashboard/coach',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
        title: 'Coach Dashboard · Turf Academy',
        loadComponent: () =>
          import('./features/dashboard/dashboard-page').then((m) => m.DashboardPage),
      },
      {
        path: 'dashboard/reception',
        canActivate: [roleGuard],
        data: { roles: ['admin', 'receptionist'] },
        title: 'Reception Dashboard · Turf Academy',
        loadComponent: () =>
          import('./features/dashboard/dashboard-page').then((m) => m.DashboardPage),
      },
      {
        path: 'parent/dashboard',
        canActivate: [roleGuard],
        data: { roles: ['parent'] },
        title: 'Parent Dashboard · Turf Academy',
        loadComponent: () =>
          import('./features/parents/parent-dashboard-page').then((m) => m.ParentDashboardPage),
      },
      {
        path: 'parent/children/:id/edit',
        canActivate: [roleGuard],
        data: { roles: ['parent'], permission: 'children:read', parentChildEdit: true },
        title: 'Complete Child Profile · Turf Academy',
        loadComponent: () =>
          import('./features/students/student-form-page').then((m) => m.StudentFormPage),
      },
      {
        path: 'parent/children/:id',
        canActivate: [roleGuard],
        data: { roles: ['parent'], permission: 'children:read' },
        title: 'Child Profile · Turf Academy',
        loadComponent: () =>
          import('./features/parents/parent-child-profile-page').then(
            (m) => m.ParentChildProfilePage,
          ),
      },
      {
        path: 'parent/children',
        canActivate: [roleGuard],
        data: { roles: ['parent'], permission: 'children:read', view: 'children' },
        loadComponent: parentPortalPage,
      },
      {
        path: 'parent/attendance',
        canActivate: [roleGuard],
        data: { roles: ['parent'], permission: 'children:read', view: 'attendance' },
        loadComponent: parentPortalPage,
      },
      {
        path: 'parent/attendance/calendar',
        canActivate: [roleGuard],
        data: { roles: ['parent'], permission: 'children:read', view: 'calendar' },
        loadComponent: parentPortalPage,
      },
      {
        path: 'parent/schedule',
        canActivate: [roleGuard],
        data: { roles: ['parent'], permission: 'children:read', view: 'schedule' },
        loadComponent: parentPortalPage,
      },
      {
        path: 'parent/coach',
        canActivate: [roleGuard],
        data: { roles: ['parent'], permission: 'children:read', view: 'coach' },
        loadComponent: parentPortalPage,
      },
      {
        path: 'parent/fees',
        canActivate: [roleGuard],
        data: { roles: ['parent'], permission: 'children:read', view: 'fees' },
        loadComponent: parentPortalPage,
      },
      {
        path: 'parent/payments',
        canActivate: [roleGuard],
        data: { roles: ['parent'], permission: 'children:read', view: 'payments' },
        loadComponent: parentPortalPage,
      },
      {
        path: 'parent/receipts',
        canActivate: [roleGuard],
        data: { roles: ['parent'], permission: 'children:read', view: 'receipt' },
        loadComponent: parentPortalPage,
      },
      {
        path: 'parent/notifications',
        canActivate: [roleGuard],
        data: { roles: ['parent'], permission: 'children:read', view: 'notifications' },
        loadComponent: parentPortalPage,
      },
      {
        path: 'parent/profile',
        canActivate: [roleGuard],
        data: { roles: ['parent'], permission: 'children:read', view: 'profile' },
        loadComponent: parentPortalPage,
      },
      {
        path: 'parent/profile/edit',
        canActivate: [roleGuard],
        data: { roles: ['parent'], permission: 'children:read' },
        title: 'Complete Parent Profile · Turf Academy',
        loadComponent: () =>
          import('./features/parents/parent-profile-form-page').then(
            (m) => m.ParentProfileFormPage,
          ),
      },
      {
        path: 'parent/support',
        canActivate: [roleGuard],
        data: { roles: ['parent'], permission: 'children:read', view: 'support' },
        loadComponent: parentPortalPage,
      },
      {
        path: 'dashboard',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
        title: 'Dashboard · Turf Academy',
        loadComponent: () =>
          import('./features/dashboard/dashboard-page').then((m) => m.DashboardPage),
      },
      // Staff directory and academy operations.
      {
        path: 'search',
        canActivate: [roleGuard],
        data: { roles: ['admin', 'receptionist'], permission: 'students:read' },
        loadComponent: () => import('./features/system/search-page').then((m) => m.SearchPage),
      },
      {
        path: 'students/add',
        canActivate: [roleGuard],
        data: { roles: ['admin', 'receptionist'], permission: 'students:write' },
        title: 'Add Student · Turf Academy',
        loadComponent: () =>
          import('./features/students/student-form-page').then((m) => m.StudentFormPage),
      },
      {
        path: 'students/:id/edit',
        canActivate: [roleGuard],
        data: { roles: ['admin', 'receptionist'], permission: 'students:write' },
        title: 'Edit Student · Turf Academy',
        loadComponent: () =>
          import('./features/students/student-form-page').then((m) => m.StudentFormPage),
      },
      {
        path: 'students/:id',
        canActivate: [roleGuard],
        data: { roles: ['admin', 'receptionist'], permission: 'students:read' },
        title: 'Student Details · Turf Academy',
        loadComponent: () =>
          import('./features/students/student-details-page').then((m) => m.StudentDetailsPage),
      },
      {
        path: 'students',
        canActivate: [roleGuard],
        data: { roles: ['admin', 'receptionist'], permission: 'students:read' },
        title: 'Students · Turf Academy',
        loadComponent: () =>
          import('./features/students/students-page').then((m) => m.StudentsPage),
      },
      {
        path: 'parents/add',
        data: { permission: 'parents:write' },
        title: 'Add Parent · Turf Academy',
        loadComponent: () =>
          import('./features/parents/parent-form-page').then((m) => m.ParentFormPage),
      },
      {
        path: 'parents/:id/edit',
        data: { permission: 'parents:write' },
        title: 'Edit Parent · Turf Academy',
        loadComponent: () =>
          import('./features/parents/parent-form-page').then((m) => m.ParentFormPage),
      },
      {
        path: 'parents/:id',
        data: { permission: 'parents:read' },
        title: 'Parent Details · Turf Academy',
        loadComponent: () =>
          import('./features/parents/parent-details-page').then((m) => m.ParentDetailsPage),
      },
      {
        path: 'parents',
        data: { permission: 'parents:read' },
        title: 'Parents · Turf Academy',
        loadComponent: () => import('./features/parents/parents-page').then((m) => m.ParentsPage),
      },
      {
        path: 'batches/student-allocation',
        data: { permission: 'batches:write' },
        title: 'Student Allocation · Turf Academy',
        loadComponent: () => import('./features/batches/batches-page').then((m) => m.BatchesPage),
      },
      {
        path: 'batches/coach-assignment',
        data: { permission: 'batches:write' },
        title: 'Coach Assignment · Turf Academy',
        loadComponent: () => import('./features/batches/batches-page').then((m) => m.BatchesPage),
      },
      {
        path: 'batches/schedule',
        data: { permission: 'batches:write' },
        title: 'Batch Schedule · Turf Academy',
        loadComponent: () => import('./features/batches/batches-page').then((m) => m.BatchesPage),
      },
      {
        path: 'batches/capacity',
        data: { permission: 'batches:write' },
        title: 'Batch Capacity · Turf Academy',
        loadComponent: () => import('./features/batches/batches-page').then((m) => m.BatchesPage),
      },
      {
        path: 'batches',
        data: { permission: 'batches:read' },
        title: 'Batches · Turf Academy',
        loadComponent: () => import('./features/batches/batches-page').then((m) => m.BatchesPage),
      },
      {
        path: 'coaches/add',
        data: { permission: 'coaches:write' },
        title: 'Add Coach · Turf Academy',
        loadComponent: () =>
          import('./features/coaches/coach-form-page').then((m) => m.CoachFormPage),
      },
      {
        path: 'coaches/:id/edit',
        data: { permission: 'coaches:write' },
        title: 'Edit Coach · Turf Academy',
        loadComponent: () =>
          import('./features/coaches/coach-form-page').then((m) => m.CoachFormPage),
      },
      {
        path: 'coaches/:id',
        data: { permission: 'coaches:read' },
        title: 'Coach Details · Turf Academy',
        loadComponent: () =>
          import('./features/coaches/coach-details-page').then((m) => m.CoachDetailsPage),
      },
      {
        path: 'coaches',
        data: { permission: 'coaches:read' },
        title: 'Coaches · Turf Academy',
        loadComponent: () => import('./features/coaches/coaches-page').then((m) => m.CoachesPage),
      },
      // Enrollment, attendance, and fees.
      {
        path: 'enrollments',
        data: { permission: 'enrollments:write' },
        title: 'Enrollment · Turf Academy',
        loadComponent: () =>
          import('./features/enrollments/enrollments-page').then((m) => m.EnrollmentsPage),
      },
      {
        path: 'enrollments/new',
        data: { permission: 'enrollments:write', enrollmentView: 'new' },
        title: 'New Enrollment · Turf Academy',
        loadComponent: () =>
          import('./features/enrollments/enrollments-page').then((m) => m.EnrollmentsPage),
      },
      {
        path: 'enrollments/transfer',
        data: { permission: 'enrollments:write', enrollmentView: 'transfer' },
        title: 'Transfer Batch · Turf Academy',
        loadComponent: () =>
          import('./features/enrollments/enrollments-page').then((m) => m.EnrollmentsPage),
      },
      {
        path: 'enrollments/pause',
        data: { permission: 'enrollments:write', enrollmentView: 'pause' },
        title: 'Pause Enrollment · Turf Academy',
        loadComponent: () =>
          import('./features/enrollments/enrollments-page').then((m) => m.EnrollmentsPage),
      },
      {
        path: 'enrollments/cancel',
        data: { permission: 'enrollments:write', enrollmentView: 'cancel' },
        title: 'Cancel Enrollment · Turf Academy',
        loadComponent: () =>
          import('./features/enrollments/enrollments-page').then((m) => m.EnrollmentsPage),
      },
      {
        path: 'enrollments/fee-plans',
        data: { permission: 'enrollments:write', enrollmentView: 'fees' },
        title: 'Fee Plans · Turf Academy',
        loadComponent: () => import('./features/fees/fee-plans-page').then((m) => m.FeePlansPage),
      },
      {
        path: 'enrollments/history',
        data: { permission: 'enrollments:write', enrollmentView: 'history' },
        title: 'Enrollment History · Turf Academy',
        loadComponent: () =>
          import('./features/enrollments/enrollments-page').then((m) => m.EnrollmentsPage),
      },
      {
        path: 'attendance',
        data: { permission: 'attendance:read' },
        title: 'Attendance · Turf Academy',
        loadComponent: () =>
          import('./features/attendance/attendance-page').then((m) => m.AttendancePage),
      },
      {
        path: 'attendance/check-in-out',
        data: { permission: 'attendance:write' },
        title: 'Check In / Check Out · Turf Academy',
        loadComponent: () =>
          import('./features/attendance/qr-attendance-page').then((m) => m.QrAttendancePage),
      },
      {
        path: 'attendance/manual-check-in',
        redirectTo: 'attendance/check-in-out',
        pathMatch: 'full',
      },
      {
        path: 'attendance/manual-check-out',
        redirectTo: 'attendance/check-in-out',
        pathMatch: 'full',
      },
      {
        path: 'attendance/qr',
        redirectTo: 'attendance/check-in-out',
        pathMatch: 'full',
      },
      {
        path: 'attendance/correction',
        data: { permission: 'attendance:write', tab: 'corrections' },
        title: 'Attendance History & Corrections · Turf Academy',
        loadComponent: () =>
          import('./features/attendance/attendance-history-corrections-page').then(
            (m) => m.AttendanceHistoryCorrectionsPage,
          ),
      },
      {
        path: 'attendance/history',
        data: { permission: 'attendance:write' },
        title: 'Attendance History & Corrections · Turf Academy',
        loadComponent: () =>
          import('./features/attendance/attendance-history-corrections-page').then(
            (m) => m.AttendanceHistoryCorrectionsPage,
          ),
      },
      {
        path: 'attendance/calendar',
        data: { permission: 'attendance:write' },
        title: 'Attendance Calendar · Turf Academy',
        loadComponent: () =>
          import('./features/attendance/attendance-calendar-page').then(
            (m) => m.AttendanceCalendarPage,
          ),
      },
      {
        path: 'attendance/offline-queue',
        pathMatch: 'full',
        redirectTo: 'attendance/check-in-out',
      },
      {
        path: 'fees/plans',
        data: { permission: 'fees:write' },
        title: 'Fee Plans · Turf Academy',
        loadComponent: () => import('./features/fees/fee-plans-page').then((m) => m.FeePlansPage),
      },
      {
        path: 'fees',
        data: { permission: 'fees:write' },
        title: 'Fees · Turf Academy',
        loadComponent: () => import('./features/fees/fees-page').then((m) => m.FeesPage),
      },
      {
        path: 'notifications',
        data: { permission: 'notifications:read' },
        title: 'Notifications · Turf Academy',
        loadComponent: () =>
          import('./features/notifications/notifications-page').then((m) => m.NotificationsPage),
      },
      {
        path: 'notifications/events',
        data: { permission: 'notifications:read' },
        title: 'Events & Holidays · Turf Academy',
        loadComponent: academyEventsPage,
      },
      {
        path: 'reports',
        data: { permission: 'reports:read' },
        title: 'Reports · Turf Academy',
        loadComponent: () => import('./features/reports/reports-page').then((m) => m.ReportsPage),
      },
      {
        path: 'auth/change-password',
        data: { title: 'Change Password', kind: 'password' },
        loadComponent: authUtilityPage,
      },
      // Additional fee workflows.
      {
        path: 'fees/discounts',
        data: { permission: 'fees:write', feeView: 'discounts' },
        loadComponent: feeOperationsPage,
      },
      {
        path: 'fees/late-fees',
        data: { permission: 'fees:write', feeView: 'late-fees' },
        loadComponent: feeOperationsPage,
      },
      {
        path: 'fees/pending',
        data: { permission: 'fees:write', feeView: 'pending' },
        loadComponent: feeOperationsPage,
      },
      {
        path: 'fees/summary',
        data: { permission: 'fees:write', feeView: 'summary' },
        loadComponent: feeOperationsPage,
      },
      // Payment views.
      {
        path: 'payments',
        data: {
          permission: 'fees:write',
          paymentView: 'list',
        },
        loadComponent: paymentsPage,
      },
      {
        path: 'payments/new',
        data: {
          permission: 'fees:write',
          paymentView: 'new',
        },
        loadComponent: paymentsPage,
      },
      {
        path: 'payments/partial',
        data: {
          permission: 'fees:write',
          paymentView: 'partial',
        },
        loadComponent: paymentsPage,
      },
      {
        path: 'payments/full',
        data: {
          permission: 'fees:write',
          paymentView: 'full',
        },
        loadComponent: paymentsPage,
      },
      {
        path: 'payments/receipts',
        data: { permission: 'fees:write', paymentView: 'receipts' },
        loadComponent: paymentsPage,
      },
      {
        path: 'payments/refunds',
        canActivate: [roleGuard],
        data: {
          roles: ['admin'],
          permission: 'fees:write',
          paymentView: 'refunds',
        },
        loadComponent: paymentsPage,
      },
      {
        path: 'payments/history',
        data: {
          permission: 'fees:write',
          paymentView: 'history',
        },
        loadComponent: paymentsPage,
      },
      // Notification channels and delivery views.
      {
        path: 'notifications/whatsapp',
        pathMatch: 'full',
        redirectTo: notificationRedirect({ channel: 'whatsapp' }),
      },
      {
        path: 'notifications/templates',
        canActivate: [roleGuard],
        data: { roles: ['admin'], permission: 'notifications:read' },
        loadComponent: notificationTemplatesPage,
      },
      {
        path: 'notifications/failed',
        pathMatch: 'full',
        redirectTo: notificationRedirect({ status: 'failed' }),
      },
      {
        path: 'notifications/delivery-status',
        pathMatch: 'full',
        redirectTo: notificationRedirect(),
      },
      // Specialized report views.
      {
        path: 'reports/coach',
        data: { permission: 'reports:read', reportScope: 'coach' },
        loadComponent: reportsPage,
      },
      {
        path: 'reports/batch',
        data: { permission: 'reports:read', reportScope: 'batch' },
        loadComponent: reportsPage,
      },
      // Administration and settings.
      {
        path: 'settings',
        canActivate: [roleGuard],
        data: { roles: ['admin'], permission: 'settings:write' },
        loadComponent: academySettingsPage,
      },
      {
        path: 'settings/users',
        canActivate: [roleGuard],
        data: { roles: ['admin'], permission: 'settings:write', settingsSection: 'users' },
        title: 'Users & Roles',
        loadComponent: academySettingsPage,
      },
      {
        path: 'settings/audit-logs',
        canActivate: [roleGuard],
        data: { roles: ['admin'], permission: 'settings:write' },
        loadComponent: () =>
          import('./features/settings/audit-log-page').then((m) => m.AuditLogPage),
      },
      {
        path: 'settings/profile',
        canActivate: [roleGuard],
        data: { roles: ['admin'], permission: 'settings:write', settingsSection: 'profile' },
        loadComponent: academySettingsPage,
      },
      {
        path: 'settings/operations',
        canActivate: [roleGuard],
        data: { roles: ['admin'], permission: 'settings:write', settingsSection: 'operations' },
        loadComponent: academySettingsPage,
      },
      { path: 'settings/regional', redirectTo: 'settings/operations', pathMatch: 'full' },
      {
        path: 'settings/attendance',
        canActivate: [roleGuard],
        data: { roles: ['admin'], permission: 'settings:write', settingsSection: 'attendance' },
        loadComponent: academySettingsPage,
      },
      { path: 'settings/fees', redirectTo: 'settings/operations', pathMatch: 'full' },
      {
        path: 'settings/notifications',
        canActivate: [roleGuard],
        data: { roles: ['admin'], permission: 'settings:write', settingsSection: 'notifications' },
        loadComponent: academySettingsPage,
      },
      { path: 'settings/roles', redirectTo: 'settings/users', pathMatch: 'full' },
      { path: 'settings/permissions', redirectTo: 'settings/users', pathMatch: 'full' },
      { path: 'settings/theme', redirectTo: 'settings/tools', pathMatch: 'full' },
      {
        path: 'settings/backup',
        redirectTo: 'settings/tools',
        pathMatch: 'full',
      },
      {
        path: 'settings/tools',
        canActivate: [roleGuard],
        data: { roles: ['admin'], permission: 'settings:write', settingsSection: 'tools' },
        loadComponent: academySettingsPage,
      },
      {
        path: 'settings/dialog-playground',
        canActivate: [roleGuard],
        data: { roles: ['admin'], permission: 'settings:write' },
        title: 'Dialog Playground · Turf Academy',
        loadComponent: () => import('./features/settings/dialog-playground/dialog-playground.component').then((m) => m.DialogPlaygroundComponent),
      },
      // Admin-only design and developer resources.
      {
        path: 'design/:section/:view',
        canActivate: [roleGuard],
        data: {
          roles: ['admin'],
          permission: 'settings:write',
          section: 'Foundations',
          title: 'Design System',
          availability: 'library',
          icon: 'pi-palette',
        },
        loadComponent: designSystemPage,
      },
      {
        path: 'handoff/:view',
        canActivate: [roleGuard],
        data: {
          roles: ['admin'],
          permission: 'settings:write',
          section: 'Developer Handoff',
          title: 'Developer Handoff',
          availability: 'library',
          icon: 'pi-code',
        },
        loadComponent: developerHandoffPage,
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
