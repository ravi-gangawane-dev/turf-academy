# Component, service and table audit

**Audit date: 22 October 2026 (Asia/Calcutta). Audit only: no application code, schema or business-data changes.**

## Inventory

| Item | Count |
| --- | --- |
| sourceFiles | 336 |
| components | 69 |
| specFiles | 104 |
| missingComponentSpecs | 0 |
| inlineTemplates | 17 |
| tables | 51 |
| migrations | 71 |
| services | 47 |

69 production components exclude 2 test-host components. All 69 have colocated specs and OnPush; 17 use inline templates.47 injectable classes and 51 table instances include 2 inline tables. Modern filenames without .component are not defects. Marker absence is not runtime failure: loading/error/empty blocks may be outside tables, and router links need not have click handlers.

## Every component

| Source | Lines | HTML | Styles | Spec | OnPush | Methods |
| --- | --- | --- | --- | --- | --- | --- |
| src/app/app.ts:4 | 12 | src/app/app.html | src/app/app.scss | src/app/app.spec.ts | Yes | None detected |
| src/app/features/attendance/attendance-calendar-page.ts:29 | 236 | src/app/features/attendance/attendance-calendar-page.html | src/app/features/attendance/attendance-calendar-page.scss | src/app/features/attendance/attendance-calendar-page.spec.ts | Yes | ngOnInit, loadCalendarData, onViewModeChange, onBatchChange, onStudentChange, onStatusChange, onDateChange, setMonth, onTodayClick, onPreviousMonth, onNextMonth, onPageChange, onPageSizeChange, export, monthValue, percentage |
| src/app/features/attendance/attendance-correction-page.ts:25 | 165 | src/app/features/attendance/attendance-correction-page.html | src/app/features/attendance/attendance-correction-page.scss | src/app/features/attendance/attendance-correction-page.spec.ts | Yes | ngOnInit, setStatus, resetFilters, setSearch, changeSortBy, sortColumn, changeSortDirection, changePage, setPageSize, resolve, relation, requestedStatus, load |
| src/app/features/attendance/attendance-history-page.ts:26 | 255 | src/app/features/attendance/attendance-history-page.html | src/app/features/attendance/attendance-history-page.scss | src/app/features/attendance/attendance-history-page.spec.ts | Yes | ngOnInit, loadAttendanceHistory, onStudentChange, onStatusChange, onPageChange, onPageSizeChange, mockHistory, export |
| src/app/features/attendance/attendance-page.ts:22 | 260 | src/app/features/attendance/attendance-page.html | src/app/features/attendance/attendance-page.scss | src/app/features/attendance/attendance-page.spec.ts | Yes | ngOnInit, percentage, initials, checkIn, checkOut, retryFor, useServerState, run, sendWhatsApp, openWhatsAppConfirmationDialog, openWhatsAppNow |
| src/app/features/attendance/manual-check-in-page.ts:21 | 124 | src/app/features/attendance/manual-check-in-page.html | src/app/features/attendance/manual-check-in-page.scss | src/app/features/attendance/manual-check-in-page.spec.ts | Yes | ngOnInit, select, retry, initials, code, submitAttendance |
| src/app/features/attendance/offline-queue-page.ts:26 | 104 | src/app/features/attendance/offline-queue-page.html | src/app/features/attendance/offline-queue-page.scss | src/app/features/attendance/offline-queue-page.spec.ts | Yes | setQuery, setSort, setPageSize, initials, formatDate, sync, retry, discard, clear, export |
| src/app/features/attendance/qr-attendance-page.ts:24 | 469 | src/app/features/attendance/qr-attendance-page.html | src/app/features/attendance/qr-attendance-page.scss | src/app/features/attendance/qr-attendance-page.spec.ts | Yes | ngOnInit, matches, focusPanel, toggleSelection, changeQuery, displayTime, markSelected, switchCamera, startCamera, stopCamera, releaseScanner, cameraErrorMessage, resolve, confirm, prepareSavedWhatsApp, prepareWhatsApp, reset, initials, ngOnDestroy |
| src/app/features/auth/auth-splash-page.ts:5 | 8 | INLINE | INLINE / no external styles | src/app/features/auth/auth-splash-page.spec.ts | Yes | ngOnInit |
| src/app/features/auth/auth-utility-page.ts:6 | 97 | src/app/features/auth/auth-utility-page.html | src/app/features/auth/login-page.scss | src/app/features/auth/auth-utility-page.spec.ts | Yes | submit, togglePassword |
| src/app/features/auth/login-page.ts:8 | 37 | src/app/features/auth/login-page.html | src/app/features/auth/login-page.scss | src/app/features/auth/login-page.spec.ts | Yes | submit, safeReturnUrl, togglePassword |
| src/app/features/auth/role-redirect-page.ts:4 | 155 | INLINE | INLINE / no external styles | src/app/features/auth/role-redirect-page.spec.ts | Yes | ngOnInit |
| src/app/features/auth/unauthorized-page.ts:4 | 6 | INLINE | INLINE / no external styles | src/app/features/auth/unauthorized-page.spec.ts | Yes | None detected |
| src/app/features/batches/batches-page.ts:22 | 177 | src/app/features/batches/batches-page.html | src/app/features/batches/batches-page.scss | src/app/features/batches/batches-page.spec.ts | Yes | setPageSize, scheduleColumnFilters, resetColumnFilters, filterChanged, changeSortBy, sortColumn, changeSortDirection, changePage, ngOnDestroy, scheduleWaitingFilters, sortWaiting, resetWaiting, changeWaitingPage, changeWaitingSize, loadWaiting, fetchWaiting, ngOnInit, load, activeCount, waitingCount, studentName, batchName, coachName, fee, schedule, hasSessionToday, edit, toggleDay, save, remove, assign, unassign, allocate, cancelEnrollment, waitAction, mutate, errorText |
| src/app/features/coach/coach-portal-page.ts:51 | 1125 | src/app/features/coach/coach-portal-page.html | src/app/features/coach/coach-portal-page.scss | src/app/features/coach/coach-portal-page.spec.ts | Yes | ngOnInit, ngOnDestroy, load, loadPanels, patchData, loadStudentsPanel, loadAttendancePanel, loadSessionsPanel, loadNotificationsPanel, changeNotificationPage, reloadRealtimePanel, setSearch, setBatchSearch, setBatchStatus, resetBatchFilters, setStudentSearch, resetStudentFilters, setBatch, setStatus, loadStudentPage, loadAttendancePage, setScheduleType, changeScheduleWeek, resetScheduleWeek, setScheduleMode, chooseStudent, selectStudent, go, initials, relation, coachSpecializations, time, age, attendanceFor, studentAttendance, summaryStudents, studentAttendanceSummary, lastAttendance, primaryParent, studentBatch, medical, address, batchStudentCount, batchAttendance, batchDays, nextSession, batchSessions, sessionsForDay, dateKey, isToday, openAttendance, todayRecord, todayDate, submitAttendance, scan, startQrCamera, stopQrCamera, markRemainingPresent, markNotificationRead, markAllNotificationsRead, requestAttendanceCorrection, exportAttendance, beginProfileEdit, saveProfile, chooseProfilePhoto, setNotificationFilter, resetNotificationFilters, resetAttendanceFilters, setPage, setPageSize |
| src/app/features/coaches/coach-details-page.ts:10 | 87 | src/app/features/coaches/coach-details-page.html | src/app/features/coaches/coach-details-page.scss | src/app/features/coaches/coach-details-page.spec.ts | Yes | batches, showAttendance, ngOnInit, initials, specs, edit, list, breadcrumb |
| src/app/features/coaches/coach-form-page.ts:7 | 128 | src/app/features/coaches/coach-form-page.html | src/app/features/coaches/coach-form-page.scss | src/app/features/coaches/coach-form-page.spec.ts | Yes | ngOnInit, save, selectPhoto, cancel, breadcrumb |
| src/app/features/coaches/coaches-page.ts:25 | 143 | src/app/features/coaches/coaches-page.html | src/app/features/coaches/coaches-page.scss | src/app/features/coaches/coaches-page.spec.ts | Yes | filterChanged, changeSortBy, sortColumn, changeSortDirection, ngOnInit, loadCoaches, create, edit, openCoachDetails, coachEmail, deleteCoach, changePage, setPageSize, openDashboard, initials |
| src/app/features/dashboard/dashboard-page.ts:16 | 45 | src/app/features/dashboard/dashboard-page.html | src/app/features/dashboard/dashboard-page.scss | src/app/features/dashboard/dashboard-page.spec.ts | Yes | chartHeight, attendanceValues, collectionValues, navigate |
| src/app/features/dashboard/recent-activity.ts:26 | 110 | INLINE | INLINE / no external styles | src/app/features/dashboard/recent-activity.spec.ts | Yes | ngOnInit, label, load |
| src/app/features/enrollments/enrollment-metrics.ts:12 | 43 | INLINE | INLINE / no external styles | src/app/features/enrollments/enrollment-metrics.spec.ts | Yes | cards |
| src/app/features/enrollments/enrollments-page.ts:39 | 490 | src/app/features/enrollments/enrollments-page.html | src/app/features/enrollments/enrollments-page.scss | src/app/features/enrollments/enrollments-page.spec.ts | Yes | sortHistory, historyQuery, changeSortBy, sortColumn, changeSortDirection, ngOnInit, reload, studentChanged, planChanged, batchChanged, submit, applyAction, reactivate, pause, save, changePage, filterChanged, setPageSize, resetFilters, applyHistoryFilters, historyPageChanged, loadHistory, historyAction, exportHistory, exportRows, download, errorText |
| src/app/features/fees/fee-operations-page.ts:48 | 244 | src/app/features/fees/fee-operations-page.html | src/app/features/fees/fee-operations-page.scss | src/app/features/fees/fee-operations-page.spec.ts | Yes | filterChanged, changeSortBy, sortColumn, changeSortDirection, changePage, setPageSize, resetFilters, close, ngOnInit, open, save, remove, student, amount, text, reload |
| src/app/features/fees/fee-plans-page.ts:38 | 197 | src/app/features/fees/fee-plans-page.html | src/app/features/fees/fee-plans-page.scss | src/app/features/fees/fee-plans-page.spec.ts | Yes | setQuery, setStatus, changeSortBy, sortColumn, changeSortDirection, setPageSize, changePage, resetFilters, ngOnInit, openAdd, open, close, save, remove, duration, reload |
| src/app/features/fees/fees-page.ts:47 | 338 | src/app/features/fees/fees-page.html | src/app/features/fees/fees-page.scss | src/app/features/fees/fees-page.spec.ts | Yes | downloadInvoice, changeSortBy, sortColumn, changeSortDirection, ngOnInit, selectCharge, confirmPay, submitPayment, openChargeDialog, enrollmentChanged, chargePeriodChanged, addCharge, changePage, setPageSize, resetPage, resetFilters, loadCharges, displayStatus |
| src/app/features/notifications/academy-events-page.ts:18 | 185 | src/app/features/notifications/academy-events-page.html | src/app/features/notifications/academy-events-page.scss | src/app/features/notifications/academy-events-page.spec.ts | Yes | ngOnInit, open, save, toggle, reload, applyFilters, setPage, setPageSize, changeSort, today |
| src/app/features/notifications/notification-templates-page.ts:43 | 360 | src/app/features/notifications/notification-templates-page.html | src/app/features/notifications/notification-templates-page.scss | src/app/features/notifications/notification-templates-page.spec.ts | Yes | ngOnDestroy, previewText, ngOnInit, open, save, toggle, applyFilters, setPage, setPageSize, changeSort, reload, loadPage, loadPreviews, loadBirthdayPreviewPhotos |
| src/app/features/notifications/notifications-page.ts:34 | 199 | src/app/features/notifications/notifications-page.html | src/app/features/notifications/notifications-page.scss | src/app/features/notifications/notifications-page.spec.ts | Yes | delivery, loadDeliveryConfiguration, sortColumn, ngOnDestroy, ngOnInit, setFilter, setCategoryFilter, clearFilters, setPageSize, changePage, setSearch, setSortBy, setSortDirection, reload, loadPage |
| src/app/features/parents/parent-child-profile-page.ts:24 | 138 | src/app/features/parents/parent-child-profile-page.html | src/app/features/parents/parent-child-profile-page.scss | src/app/features/parents/parent-child-profile-page.spec.ts | Yes | ngOnInit, load, setTab, back, edit, message, initials, age, text, related, money |
| src/app/features/parents/parent-dashboard-page.ts:44 | 271 | src/app/features/parents/parent-dashboard-page.html | src/app/features/parents/parent-dashboard-page.scss | src/app/features/parents/parent-dashboard-page.spec.ts | Yes | ngOnInit, ngOnDestroy, address, initials, batch, attendance, selectChild, replaceSubscriptions, age, batchRecord, fee, time, nextSession, todayAttendance, duration, recordDate, recordTime, amount, openChild, message, retry |
| src/app/features/parents/parent-details-page.ts:20 | 127 | src/app/features/parents/parent-details-page.html | src/app/features/parents/parent-details-page.scss | src/app/features/parents/parent-details-page.spec.ts | Yes | ngOnInit, addressPart, preference, selectTab, setPageSize, sendMessage, initials, edit, openStudent, list, breadcrumb |
| src/app/features/parents/parent-form-page.ts:9 | 133 | src/app/features/parents/parent-form-page.html | src/app/features/parents/parent-form-page.scss | src/app/features/parents/parent-form-page.spec.ts | Yes | ngOnInit, save, selectPhoto, cancel, breadcrumb |
| src/app/features/parents/parent-portal-page.ts:42 | 437 | src/app/features/parents/parent-portal-page.html | src/app/features/parents/parent-portal-page.scss | src/app/features/parents/parent-portal-page.spec.ts | Yes | ngOnInit, ngOnDestroy, load, changeChild, filterAttendance, searchAttendance, sortAttendance, filterAttendanceDate, setAttendancePage, setAttendancePageSize, setPaymentPage, setPaymentPageSize, filterPayments, searchPayments, sortPayments, toggleUnread, filterNotifications, setNotificationPage, setNotificationPageSize, markRead, markAllRead, replaceSubscriptions, resetPages, childProfile, editChild, childCompletion, viewTitle, addressText, go, shiftMonth, today, text, related, duration, initials, open, printReceipt, value, money, receipt |
| src/app/features/parents/parent-profile-form-page.ts:8 | 114 | src/app/features/parents/parent-profile-form-page.html | src/app/features/parents/parent-profile-form-page.scss | src/app/features/parents/parent-profile-form-page.spec.ts | Yes | ngOnInit, choosePhoto, save, cancel |
| src/app/features/parents/parents-page.ts:25 | 263 | src/app/features/parents/parents-page.html | src/app/features/parents/parents-page.scss | src/app/features/parents/parents-page.spec.ts | Yes | ngOnInit, edit, deleteParent, addParent, openDetails, refresh, exportParents, changePage, changePageSize, applyDirectoryFilters, changeSortBy, sortColumn, changeSortDirection, resetDirectoryFilters, initials, emailFor, joinedOn, openDashboard, loadParents, downloadCsv |
| src/app/features/payments/payments-page.ts:58 | 309 | src/app/features/payments/payments-page.html | src/app/features/payments/payments-page.scss | src/app/features/payments/payments-page.spec.ts | Yes | ngOnInit, chargeChanged, submit, changePage, setPageSize, setSearch, resetFilters, setStatus, setSortBy, sortColumn, setSortDirection, printReceipt, openRefund, submitRefund, reload, paymentStudent, paymentReceipt, chargeStudent |
| src/app/features/reports/reports-page.ts:118 | 723 | src/app/features/reports/reports-page.html | src/app/features/reports/reports-page.scss | src/app/features/reports/reports-page.spec.ts | Yes | ngOnInit, updateReportType, updateReportPeriod, toggleChart, toggleFilters, changeReportPage, changeReportPageSize, updateChartMetric, updateChartType, updateChartGroup, aggregateChartValues, numericValue, updateScopeFilters, scopedDataset, coachDataset, generate, setGeneratedReport, loadDataset, dataset, related, money, exportCsv, viewReportDetail, print |
| src/app/features/settings/academy-settings-page.ts:12 | 139 | src/app/features/settings/academy-settings-page.html | src/app/features/settings/academy-settings-page.scss | src/app/features/settings/academy-settings-page.spec.ts | Yes | show, ngOnInit, save, openTestWhatsAppMessage, load |
| src/app/features/settings/audit-log-page.ts:46 | 562 | INLINE | INLINE / no external styles | src/app/features/settings/audit-log-page.spec.ts | Yes | ngOnInit, ngOnDestroy, cancelFilterTimer, scheduleFilters, sortColumn, resetFilters, query, setPageSize, load, export |
| src/app/features/settings/settings-navigation.ts:9 | 83 | src/app/features/settings/settings-navigation.html | src/app/features/settings/settings-navigation.scss | src/app/features/settings/settings-navigation.spec.ts | Yes | focusPanel, openSimpleDialog, invite |
| src/app/features/settings/settings-tools-page.ts:40 | 255 | INLINE | INLINE / no external styles | src/app/features/settings/settings-tools-page.spec.ts | Yes | ngOnInit, setTheme, exportData |
| src/app/features/settings/users-page.ts:15 | 38 | src/app/features/settings/users-page.html | src/app/features/settings/users-page.scss | src/app/features/settings/users-page.spec.ts | Yes | ngOnInit, ngOnDestroy, invite, changeAccess, scheduleFilters, setPage, setPageSize, sortColumn, reload |
| src/app/features/students/student-details-page.ts:26 | 170 | src/app/features/students/student-details-page.html | src/app/features/students/student-details-page.scss | src/app/features/students/student-details-page.spec.ts | Yes | sortTable, ngOnInit, retry, load, openBreadcrumb, edit, backToStudents, markAttendance, openPayments, sendMessage, setTab, initials, text, timelineValue, related, fileSize, amount, changeHistoryPage, changeHistoryPageSize |
| src/app/features/students/student-form-page.ts:7 | 187 | src/app/features/students/student-form-page.html | src/app/features/students/student-form-page.scss | src/app/features/students/student-form-page.spec.ts | Yes | ngOnInit, save, cancel, selectPhoto, openBreadcrumb |
| src/app/features/students/students-page.ts:29 | 268 | src/app/features/students/students-page.html | src/app/features/students/students-page.scss | src/app/features/students/students-page.spec.ts | Yes | ngOnInit, search, filter, changeSortBy, sortColumn, changeSortDirection, resetFilters, goToPage, setPageSize, retry, openAdd, openStudent, editStudent, openBreadcrumb, initials, hideBrokenImage, deleteStudent, exportStudents, load, loadMetrics, loadFilters |
| src/app/features/system/design-system-page.ts:5 | 96 | INLINE | INLINE / no external styles | src/app/features/system/design-system-page.spec.ts | Yes | None detected |
| src/app/features/system/developer-handoff-page.ts:5 | 100 | INLINE | INLINE / no external styles | src/app/features/system/developer-handoff-page.spec.ts | Yes | None detected |
| src/app/features/system/module-page.ts:12 | 33 | src/app/features/system/module-page.html | src/app/features/system/module-page.scss | src/app/features/system/module-page.spec.ts | Yes | None detected |
| src/app/features/system/search-page.ts:6 | 20 | INLINE | INLINE / no external styles | src/app/features/system/search-page.spec.ts | Yes | search |
| src/app/layout/staff-layout/staff-layout.ts:32 | 290 | src/app/layout/staff-layout/staff-layout.html | src/app/layout/staff-layout/staff-layout.scss | src/app/layout/staff-layout/staff-layout.spec.ts | Yes | navigationItems, toggleMenu, toggleCoachAttendanceMenu, submitGlobalSearch, ngOnInit, loadParentUnread, loadProfilePhoto, itemRoute, itemLabel, logout |
| src/app/shared/academy-support.ts:4 | 73 | INLINE | INLINE / no external styles | src/app/shared/academy-support.spec.ts | Yes | None detected |
| src/app/shared/async-state/async-state.ts:3 | 16 | src/app/shared/async-state/async-state.html | src/app/shared/async-state/async-state.scss | src/app/shared/async-state/async-state.spec.ts | Yes | None detected |
| src/app/shared/calendar-layout/calendar-layout.ts:3 | 10 | src/app/shared/calendar-layout/calendar-layout.html | src/app/shared/calendar-layout/calendar-layout.scss | src/app/shared/calendar-layout/calendar-layout.spec.ts | Yes | None detected |
| src/app/shared/column-filter/column-filter.ts:3 | 29 | INLINE | INLINE / no external styles | src/app/shared/column-filter/column-filter.spec.ts | Yes | None detected |
| src/app/shared/data-table/data-table.ts:5 | 23 | src/app/shared/data-table/data-table.html | src/app/shared/data-table/data-table.scss | src/app/shared/data-table/data-table.spec.ts | Yes | None detected |
| src/app/shared/data-table/table-tools.ts:5 | 89 | INLINE | INLINE / no external styles | src/app/shared/data-table/table-tools.spec.ts | Yes | ngAfterViewInit, ngOnDestroy, rows, isButtonColumn, exportPage |
| src/app/shared/filter-bar/filter-bar.ts:3 | 71 | INLINE | INLINE / no external styles | src/app/shared/filter-bar/filter-bar.spec.ts | Yes | onInput |
| src/app/shared/interaction-dialog/interaction-dialog.ts:5 | 12 | src/app/shared/interaction-dialog/interaction-dialog.html | src/app/shared/interaction-dialog/interaction-dialog.scss | src/app/shared/interaction-dialog/interaction-dialog.spec.ts | Yes | cancel |
| src/app/shared/notification-section-nav/notification-section-nav.ts:4 | 14 | src/app/shared/notification-section-nav/notification-section-nav.html | src/app/shared/notification-section-nav/notification-section-nav.scss | src/app/shared/notification-section-nav/notification-section-nav.spec.ts | Yes | None detected |
| src/app/shared/page-hero/page-hero.ts:10 | 32 | src/app/shared/page-hero/page-hero.html | src/app/shared/page-hero/page-hero.scss | src/app/shared/page-hero/page-hero.spec.ts | Yes | None detected |
| src/app/shared/pagination/pagination.ts:4 | 51 | src/app/shared/pagination/pagination.html | src/app/shared/pagination/pagination.scss | src/app/shared/pagination/pagination.spec.ts | Yes | selectPage, selectPageSize |
| src/app/shared/sortable-header/sortable-header.ts:5 | 62 | INLINE | INLINE / no external styles | src/app/shared/sortable-header/sortable-header.spec.ts | Yes | None detected |
| src/app/shared/status-badge/status-badge.ts:8 | 20 | INLINE | INLINE / no external styles | src/app/shared/status-badge/status-badge.spec.ts | Yes | None detected |
| src/app/shared/summary-cards/summary-cards.ts:13 | 24 | src/app/shared/summary-cards/summary-cards.html | src/app/shared/summary-cards/summary-cards.scss | src/app/shared/summary-cards/summary-cards.spec.ts | Yes | None detected |
| src/app/shared/summary-metric-card/summary-metric-card.ts:6 | 21 | src/app/shared/summary-metric-card/summary-metric-card.html | src/app/shared/summary-metric-card/summary-metric-card.scss | src/app/shared/summary-metric-card/summary-metric-card.spec.ts | Yes | None detected |
| src/app/shared/toast/toast-host.ts:2 | 3 | INLINE | INLINE / no external styles | src/app/shared/toast/toast-host.spec.ts | Yes | None detected |
| src/app/shared/ui-card/ui-card.ts:3 | 14 | src/app/shared/ui-card/ui-card.html | src/app/shared/ui-card/ui-card.scss | src/app/shared/ui-card/ui-card.spec.ts | Yes | None detected |
| src/app/shared/whatsapp-action/whatsapp-action.ts:9 | 61 | src/app/shared/whatsapp-action/whatsapp-action.html | src/app/shared/whatsapp-action/whatsapp-action.scss | src/app/shared/whatsapp-action/whatsapp-action.spec.ts | Yes | open |
| src/app/shared/whatsapp-confirmation-dialog/whatsapp-confirmation-dialog.ts:9 | 67 | src/app/shared/whatsapp-confirmation-dialog/whatsapp-confirmation-dialog.html | src/app/shared/whatsapp-confirmation-dialog/whatsapp-confirmation-dialog.scss | src/app/shared/whatsapp-confirmation-dialog/whatsapp-confirmation-dialog.spec.ts | Yes | openWhatsApp, cancel |

## Test quality

21 specs contain only one creation test. They passed but do not prove live CRUD/business correctness:

- src/app/features/attendance/attendance-correction-page.spec.ts
- src/app/features/attendance/attendance-page.spec.ts
- src/app/features/attendance/manual-check-in-page.spec.ts
- src/app/features/attendance/offline-queue-page.spec.ts
- src/app/features/auth/auth-splash-page.spec.ts
- src/app/features/auth/login-page.spec.ts
- src/app/features/auth/role-redirect-page.spec.ts
- src/app/features/auth/unauthorized-page.spec.ts
- src/app/features/coach/coach-portal-page.spec.ts
- src/app/features/coaches/coaches-page.spec.ts
- src/app/features/dashboard/dashboard-page.spec.ts
- src/app/features/parents/parent-dashboard-page.spec.ts
- src/app/features/parents/parent-form-page.spec.ts
- src/app/features/parents/parent-profile-form-page.spec.ts
- src/app/features/parents/parents-page.spec.ts
- src/app/features/settings/academy-settings-page.spec.ts
- src/app/features/settings/settings-navigation.spec.ts
- src/app/features/settings/users-page.spec.ts
- src/app/features/students/students-page.spec.ts
- src/app/shared/ui-card/ui-card.spec.ts
- src/app/shared/whatsapp-action/whatsapp-action.spec.ts

## Every table

| Table source | Headers | Handlers / actions | Sort/filter markers | Pagination / coverage |
| --- | --- | --- | --- | --- |
| src/app/features/settings/audit-log-page.ts:35 | Date / Action / Table / Record / Account | No click expression; links may exist | 10 / 0 | Related page controls have server traces; conditional tables not individually certified |
| src/app/features/settings/settings-tools-page.ts:19 | Role / Permissions / {{ role }} | No click expression; links may exist | 0 / 0 | Detail/summary/other: per-table controls not independently verified |
| src/app/features/attendance/attendance-calendar-page.html:166 | Date / Student / Batch / Check In / Check Out / Status / Remarks | No click expression; links may exist | 0 / 0 | Detail/summary/other: per-table controls not independently verified |
| src/app/features/attendance/attendance-correction-page.html:28 | Student / Date / Batch / Current / Requested / Reason / Status / Actions / Reset | columns.reset(); resolve(row['id'], true); resolve(row['id'], false) | 14 / 7 | Detail/summary/other: per-table controls not independently verified |
| src/app/features/attendance/attendance-history-page.html:72 | {{ col }} | No click expression; links may exist | 0 / 0 | Detail/summary/other: per-table controls not independently verified |
| src/app/features/attendance/offline-queue-page.html:46 | # / Student / Type / Date / Time / Status / Reason / Actions | retry(row.id); discard(row.id) | 12 / 0 | Detail/summary/other: per-table controls not independently verified |
| src/app/features/attendance/qr-attendance-page.html:407 | Student / Action / Time / Batch / Parent update | prepareSavedWhatsApp(event.studentId, event.batchId, event.action === 'Check in' ? 'check_in' : 'check_out', event.name) | 0 / 0 | Bounded recent/workspace; I08 |
| src/app/features/attendance/qr-attendance-page.html:456 | Schedule / Batch / Program / Inside | No click expression; links may exist | 0 / 0 | Bounded recent/workspace; I08 |
| src/app/features/batches/batches-page.html:225 | Student / Batch / Status / Start / Action / Reset | resetColumnFilters(); cancelEnrollment(e.id) | 8 / 0 | Related page controls have server traces; conditional tables not individually certified |
| src/app/features/batches/batches-page.html:283 | # / Batch / Schedule / Coaches / Capacity / Status / Monthly fee / Actions / Reset | resetColumnFilters(); unassign(b.id, c.coach_id); edit(b); remove(b) | 12 / 0 | Related page controls have server traces; conditional tables not individually certified |
| src/app/features/batches/batches-page.html:416 | Student / Batch / Added / Actions | waitAction(w.batch_id, w.student_id, 'promote'); waitAction(w.batch_id, w.student_id, 'remove') | 6 / 0 | Related page controls have server traces; conditional tables not individually certified |
| src/app/features/coach/coach-portal-page.html:65 | Batch / Age group / Students / Schedule / Status | No click expression; links may exist | 0 / 0 | Detail/summary/other: per-table controls not independently verified |
| src/app/features/coach/coach-portal-page.html:396 | Date / Day / Time / Topic / focus / Status | No click expression; links may exist | 0 / 0 | Detail/summary/other: per-table controls not independently verified |
| src/app/features/coach/coach-portal-page.html:433 | Date / Day / Time / Topic / focus / Venue | No click expression; links may exist | 0 / 0 | Detail/summary/other: per-table controls not independently verified |
| src/app/features/coach/coach-portal-page.html:535 | # / Student / Student ID / Age / Batch / Attendance / Last attendance / Status / Actions | selectStudent(s.id); $event.stopPropagation(); go('/coach/students/' + s.id) | 0 / 0 | Detail/summary/other: per-table controls not independently verified |
| src/app/features/coach/coach-portal-page.html:818 | Date / Day / Check in / Check out / Status | No click expression; links may exist | 0 / 0 | Detail/summary/other: per-table controls not independently verified |
| src/app/features/coach/coach-portal-page.html:956 | # / Student / Student ID / Age / Status / Check-in time / Check-out time / Actions | go('/coach/students/' + student.id) | 0 / 0 | Detail/summary/other: per-table controls not independently verified |
| src/app/features/coach/coach-portal-page.html:1198 | # / Student / Student ID / Total / Present / Absent / Late / Attendance | No click expression; links may exist | 0 / 0 | Detail/summary/other: per-table controls not independently verified |
| src/app/features/coach/coach-portal-page.html:1640 | Date / Student / Batch / Check in / Check out / Status / Source / Remarks | No click expression; links may exist | 0 / 0 | Detail/summary/other: per-table controls not independently verified |
| src/app/features/coaches/coach-details-page.html:9 | Batch / Present / Late / Absent / Total records | No click expression; links may exist | 0 / 0 | Detail/summary/other: per-table controls not independently verified |
| src/app/features/coaches/coaches-page.html:40 | # / Coach / Specialization / Contact / Experience / Qualification / Status / Actions / Reset | columns.reset(); openCoachDetails(coach); openCoachDetails(coach); edit(coach); deleteCoach(coach) | 12 / 6 | Related page controls have server traces; conditional tables not individually certified |
| src/app/features/enrollments/enrollments-page.html:18 | Student / Batch / Fee plan / Monthly fee / Validity / Status / Actions / Reset | columns.reset(); pause(row.id); reactivate(row.id) | 12 / 6 | Related page controls have server traces; conditional tables not individually certified |
| src/app/features/enrollments/enrollments-page.html:184 | Recorded at / Effective date / Student / Action / Batch / Performed by / Reason | No click expression; links may exist | 14 / 7 | Related page controls have server traces; conditional tables not individually certified |
| src/app/features/fees/fee-operations-page.html:60 | Student / Period / Base / Discount / Late fee / Paid / Balance / Status | No click expression; links may exist | 16 / 8 | Detail/summary/other: per-table controls not independently verified |
| src/app/features/fees/fee-operations-page.html:85 | Name / Kind / Value / {{ view === 'late-fees' ? 'Grace days' : 'Validity' }} / Status / Actions | open(row); remove(row) | 10 / 5 | Detail/summary/other: per-table controls not independently verified |
| src/app/features/fees/fee-plans-page.html:30 | # / Plan name / Description / Duration / Monthly fee / Total fee / Status / Actions / Reset | columns.reset(); open(plan); open(plan, true); remove(plan) | 12 / 6 | Related page controls have server traces; conditional tables not individually certified |
| src/app/features/fees/fees-page.html:35 | # / Student name / Batch / Fee plan / Month / Monthly charge / Due date / Status / Actions / Reset | columns.reset(); downloadInvoice(row.id); confirmPay(row.id, row.balancePaise, row.studentName) | 14 / 7 | Related page controls have server traces; conditional tables not individually certified |
| src/app/features/notifications/academy-events-page.html:20 | Date / Event / Type / Description / Status / Actions / Reset | columns.reset(); reload(); open(row); toggle(row) | 10 / 5 | Detail/summary/other: per-table controls not independently verified |
| src/app/features/notifications/notification-templates-page.html:84 | Name / Key / Channel / Message / Status / Actions / Reset | columns.reset(); open(row); toggle(row) | 10 / 5 | Detail/summary/other: per-table controls not independently verified |
| src/app/features/notifications/notifications-page.html:15 | Message / Recipient / Channel / Type / Status / Date / Actions / Reset | columns.reset(); delivery(row) | 12 / 6 | Related page controls have server traces; conditional tables not individually certified |
| src/app/features/parents/parent-child-profile-page.html:186 | Date / Batch / Status / Check in / Check out | No click expression; links may exist | 0 / 0 | Detail/summary/other: per-table controls not independently verified |
| src/app/features/parents/parent-child-profile-page.html:230 | Date / Amount / Method / Reference / Status | No click expression; links may exist | 0 / 0 | Detail/summary/other: per-table controls not independently verified |
| src/app/features/parents/parent-dashboard-page.html:242 | Date / Status / Check in / Check out | No click expression; links may exist | 0 / 0 | Detail/summary/other: per-table controls not independently verified |
| src/app/features/parents/parent-dashboard-page.html:279 | Date / Amount / Method / Status | No click expression; links may exist | 0 / 0 | Detail/summary/other: per-table controls not independently verified |
| src/app/features/parents/parent-details-page.html:37 | Date / Record / Action / By | No click expression; links may exist | 0 / 0 | Detail/summary/other: per-table controls not independently verified |
| src/app/features/parents/parent-details-page.html:41 | Date / Amount / Status / Receipts | No click expression; links may exist | 0 / 0 | Detail/summary/other: per-table controls not independently verified |
| src/app/features/parents/parent-portal-page.html:106 | Date / Session / Check in / Check out / Duration / Status | No click expression; links may exist | 6 / 0 | Detail/summary/other: per-table controls not independently verified |
| src/app/features/parents/parent-portal-page.html:259 | Month / Base / Discount / Late fee / Amount / Paid / Outstanding / Due date / Status | No click expression; links may exist | 0 / 0 | Detail/summary/other: per-table controls not independently verified |
| src/app/features/parents/parent-portal-page.html:316 | Date / Amount / Method / Transaction ID / Status / Receipt | open(receipt(p, 'url')) | 10 / 0 | Detail/summary/other: per-table controls not independently verified |
| src/app/features/parents/parents-page.html:41 | # / Parent name / Relation / Phone / Email / Children / Status / Joined on / Actions / Reset | columns.reset(); openDetails(row.id); openDetails(row.id); edit(row); deleteParent(row) | 14 / 7 | Related page controls have server traces; conditional tables not individually certified |
| src/app/features/payments/payments-page.html:57 | Receipt / Student / Date / Mode / Status / Amount / Action / Reset | columns.reset(); printReceipt(row) | 12 / 6 | Related page controls have server traces; conditional tables not individually certified |
| src/app/features/reports/reports-page.html:186 | {{ column.label }} | No click expression; links may exist | 0 / 0 | In-memory display slice; I08 |
| src/app/features/reports/reports-page.html:375 | {{ column.label }} | No click expression; links may exist | 0 / 0 | In-memory display slice; I08 |
| src/app/features/settings/users-page.html:7 | User / Contact / Role / Status / Joined | No click expression; links may exist | 10 / 0 | Related page controls have server traces; conditional tables not individually certified |
| src/app/features/students/student-details-page.html:191 | Document / Category / Uploaded on / Uploaded by / Size (bytes) | No click expression; links may exist | 10 / 5 | Detail/summary/other: per-table controls not independently verified |
| src/app/features/students/student-details-page.html:234 | Date / Batch / Status / Check in / Check out / Marked by | No click expression; links may exist | 12 / 6 | Detail/summary/other: per-table controls not independently verified |
| src/app/features/students/student-details-page.html:275 | Date / Amount / Mode / Reference / Status / Recorded by | No click expression; links may exist | 12 / 6 | Detail/summary/other: per-table controls not independently verified |
| src/app/features/students/student-details-page.html:330 | Date / Type / Detail | No click expression; links may exist | 6 / 3 | Detail/summary/other: per-table controls not independently verified |
| src/app/features/students/students-page.html:41 | # / Student / Batch / Program / Coach / Date of birth / Phone / Status / Parent / Guardian / Join date / Actions / Reset | columns.reset(); openStudent(row.id); openStudent(row.id); editStudent(row.id); deleteStudent(row) | 16 / 8 | Related page controls have server traces; conditional tables not individually certified |
| src/app/features/system/module-page.html:3 | Receipt / Student / Date / Mode / Amount | No click expression; links may exist | 0 / 0 | Detail/summary/other: per-table controls not independently verified |
| src/app/features/system/module-page.html:5 | Student / Period / Charge / Balance / Status | No click expression; links may exist | 0 / 0 | Detail/summary/other: per-table controls not independently verified |

## Runtime table controls

| Route | Sort requests | Page-size requests | Filter requests | Empty/result |
| --- | --- | --- | --- | --- |
| students | 2 | 2 | 1 |  |
| parents | 1 | 1 | 1 | Loading parents... |
| batches | 1 | 1 | Not exercised | CHECKED |
| coaches | 1 | 1 | 1 | Loading coaches... |
| enrollments | 1 | 1 | 1 |  |
| attendance/history | Not exercised | 1 | Not exercised | CHECKED |
| fees/plans | 1 | 1 | 1 | 1Advanced ProgramAdvanced cricket development12 Months₹3,500.00 ₹42,000.00 active2Beginners ProgramCricket foundations12 Months₹2,000.00 ₹24,000.00 active3E2E Plan b23cc8a61 Month₹1,000.00 ₹1,000.00 active4E2E Plan e7d9fd051 Month₹1,000.00 ₹1,000.00 active5E2E Skills Camp 1789498709159Focused skills development2 Months₹1,800.00 ₹3,600.00 active6E2E Skills Camp 1789499257348Focused skills development2 Months₹1,800.00 ₹3,600.00 active7E2E Skills Camp 1789499499897Focused skills development2 Months₹1,800.00 ₹3,600.00 active8E2E Skills Camp 1789499652089Focused skills development2 Months₹1,800.00 ₹3,600.00 active9E2E Skills Camp 1789530953363Focused skills development2 Months₹1,800.00 ₹3,600.00 active10E2E Skills Camp 1789535807332Focused skills development2 Months₹1,800.00 ₹3,600.00 active |
| fees | 1 | 1 | 1 | 1Aditya MehtaU16 - EliteElite Program2026-06-01₹5,000.0010 Jun 2026paid2Aditya MehtaU16 - EliteElite Program2026-08-01₹4,750.0010 Aug 2026paid3Aditya MehtaU16 - EliteElite Program2026-07-01₹5,000.0010 Jul 2026paid4Aditya MehtaU16 - EliteElite Program2026-09-01₹5,100.0010 Sep 2026paid5Arjun DeshmukhU12 - BeginnersBeginners Program2026-08-01₹1,750.0010 Aug 2026paid6Arjun DeshmukhU12 - BeginnersBeginners Program2026-09-01₹2,100.0010 Sep 2026partial7Arjun DeshmukhU12 - BeginnersBeginners Program2026-07-01₹2,000.0010 Jul 2026paid8Arjun DeshmukhU12 - BeginnersBeginners Program2026-06-01₹2,000.0010 Jun 2026paid9E2E Assigned b23cc8a6E2E Assigned b23cc8a6E2E Plan b23cc8a62026-09-01₹2,000.0010 Sep 2026partial10E2E Player 4696ba79U14 - AdvancedAdvanced Program2026-09-01₹3,500.0016 Sep 2026pending |
| notifications | 6 | 6 | 6 | Loading notifications? |
| payments | 2 | 2 | 2 | RCP-202609-05E39939A2C04CECBFF1B937FEAD763BE2E Assigned b23cc8a6E2E-A-b23cc8a6Sep 29, 2026, 3:01:23 PMCashsuccessful₹100.05RCP-202609-3562A2FEB9824947A84437B0BF43367AE2E Assigned b23cc8a6E2E-A-b23cc8a6Sep 29, 2026, 3:01:23 PMCashrefunded₹100.05RCP-202609-38CC08A570554C59A23AF974A8B3D009E2E Assigned b23cc8a6E2E-A-b23cc8a6Sep 29, 2026, 3:01:23 PMCashsuccessful₹100.05RCP-202609-445458D28689471BAAF0B75CA0A376ECE2E Assigned b23cc8a6E2E-A-b23cc8a6Sep 29, 2026, 3:01:24 PMCashsuccessful₹100.05RCP-202609-49D74B4A89C74759A0383876A5290719E2E Assigned b23cc8a6E2E-A-b23cc8a6Sep 29, 2026, 3:01:23 PMCashsuccessful₹100.05RCP-202609-57546515413342FDBCD34B0D1849229EE2E Player 4c7f9d7bE2E-4c7f9d7bSep 25, 2026, 1:27:24 PMCashsuccessful₹3,000.00RCP-202609-99307151405E4FDE8381D37AD0E1A460E2E Assigned b23cc8a6E2E-A-b23cc8a6Sep 29, 2026, 3:01:23 PMCashsuccessful₹100.05RCP-202609-A3B885A18A3F40BA8CE5CB91A859FA86E2E Assigned b23cc8a6E2E-A-b23cc8a6Sep 29, 2026, 3:01:24 PMCashsuccessful₹100.05RCP-202609-C46782195F144845931043DD639D9E58E2E Assigned b23cc8a6E2E-A-b23cc8a6Sep 29, 2026, 3:01:22 PMCashpartially refunded₹100.05RCP-202609-DB2F067233674E26A69EBDC7112A89C1E2E Assigned b23cc8a6E2E-A-b23cc8a6Sep 29, 2026, 3:01:23 PMCashsuccessful₹100.05 |
| settings/users | 1 | 1 | Not exercised | CHECKED |
| settings/audit-logs | 1 | 1 | Not exercised | CHECKED |

Backend offset/limit or RPC page/size/sort/filter arguments establish server dispatch for sampled controls. Zero-match results do not establish aggregate reconciliation for every filter. Payment History fails separately.

Main directories have trailing Actions and View/Edit/Delete handlers; batches/fees/payments use business-specific actions. Event Action is data, not misplaced CRUD; Reset is a filter control. Confirm dialogs appear at students-page.ts:169, parents-page.ts:87, coaches-page.ts:115, batches-page.ts:160/172. No destructive confirmation was accepted. Permission enforcement and completed mutation actions remain unverified live.

Loading/empty/error source exists; impossible filters and payment error were observed. Every latency/error transition was not injected across all51 tables. Detail/calendar/dashboard summaries may legitimately omit generic CRUD/pagination. Full totals/action-order/internal-scroll behavior is not blanket certified. Inline-template table line numbers are relative to the template string; source filename identifies the containing component.

## Every injectable service

| Source | Class | Methods |
| --- | --- | --- |
| src/app/core/api/http-academy.repositories.ts | HttpStudentsRepository | list, get, register, update |
| src/app/core/api/http-academy.repositories.ts | HttpParentsRepository | list, create, update |
| src/app/core/api/http-academy.repositories.ts | HttpBatchesRepository | list, create, update, delete |
| src/app/core/api/http-academy.repositories.ts | HttpCoachesRepository | list, create, update |
| src/app/core/api/http-academy.repositories.ts | HttpEnrollmentsRepository | list, create, changeStatus, transfer |
| src/app/core/api/http-academy.repositories.ts | HttpAttendanceRepository | list, identifyQr, checkIn, checkOut |
| src/app/core/api/http-academy.repositories.ts | HttpFeesRepository | list, recordPayment |
| src/app/core/api/http-academy.repositories.ts | HttpNotificationsRepository | list, retry |
| src/app/core/api/http-academy.repositories.ts | HttpReportsRepository | generate |
| src/app/core/api/http-dashboard.repository.ts | HttpDashboardRepository | getSummary |
| src/app/core/api/mock-dashboard.repository.ts | MockDashboardRepository | getSummary |
| src/app/core/api/supabase-attendance.repository.ts | SupabaseAttendanceRepository | whatsappMessage, workspace, list, identifyQr, checkIn, checkOut |
| src/app/core/api/supabase-dashboard.repository.ts | SupabaseDashboardRepository | getSummary, load, staffMetrics |
| src/app/core/auth/auth.service.ts | AuthService | ensureInitialized, login, logout, resetPassword, verifyOtp, changePassword, accessToken, hasRole, hasPermission, dashboardForRole, refresh, friendlyError, initializeSupabase, loginWithSupabase, restoreSession, refreshSupabase, writeAudit, updateToken, clearSession, saveMockSession, readMockSession |
| src/app/core/auth/user-management.service.ts | UserManagementService | list, invite, update, invoke |
| src/app/core/offline/attendance-outbox.service.ts | AttendanceOutboxService | queueCheckIn, queueCheckOut, retry, discard, clear, replay, load, save, operation |
| src/app/core/offline/attendance-outbox.storage.ts | AttendanceOutboxStorage | list, put, delete, store |
| src/app/core/services/whatsapp.service.ts | WhatsappService | createMessage, normalizeRecipient, createLink, openWhatsApp, accept |
| src/app/core/state/academy.facade.ts | AcademyFacade | initialize, refresh, loadAttendanceWorkspace, registerStudent, updateStudent, updateParent, addParent, linkStudentToParent, addBatch, updateBatch, deleteBatch, addCoach, updateCoach, enroll, setEnrollmentStatus, reactivateEnrollment, transferEnrollment, retryNotification, attendanceWhatsApp, checkIn, identifyQrCode, generateReport, checkOut, recordPayment, addMonthlyCharge, run, handleError |
| src/app/core/state/academy.store.ts | AcademyStore | identifyQrCode, buildReport, hydrateAttendance, hydrate, registerStudent, updateStudent, updateParent, addParent, linkStudentToParent, addBatch, addCoach, updateCoach, updateBatch, deleteBatch, enroll, setEnrollmentStatus, reactivateEnrollment, transferEnrollment, checkIn, checkOut, addPendingCheckIn, markPendingCheckOut, reconcileAttendance, markAttendanceSyncState, recordPayment, addMonthlyCharge, id, assertBatchCapacity, assertCoachScheduleAvailable, restoreMockState, persistMockState, queueAttendanceNotification |
| src/app/core/supabase/academy-preferences.service.ts | AcademyPreferencesService | load, today, money |
| src/app/core/supabase/attendance-calendar.service.ts | AttendanceCalendarService | mockRows, query, getMonthStats, getWeekStats, getListView |
| src/app/core/supabase/batch-workspace.service.ts | BatchWorkspaceService | waitlistPage, all, load, activeEnrollment, save, remove, assign, waitlist |
| src/app/core/supabase/database.service.ts | DatabaseService | unwrap |
| src/app/core/supabase/domain-services.ts | StudentsService | list, get, create, update |
| src/app/core/supabase/domain-services.ts | ParentsService | list, save, link, directory, directoryExport, directoryPage, directoryCounts, photoUrl, getById, getByProfile, create, update, updateOwnProfile |
| src/app/core/supabase/domain-services.ts | CoachesService | list, save, getById, create, update, saveSpecializations |
| src/app/core/supabase/domain-services.ts | BatchesService | list, save, listPage |
| src/app/core/supabase/domain-services.ts | EnrollmentsService | allRows, workspace, historyPage, exportHistory, list, create, changeStatus, transfer |
| src/app/core/supabase/domain-services.ts | AttendanceService | history, listCorrections, correctionPage, resolveCorrection, list, checkIn, checkOut, correct, subscribe |
| src/app/core/supabase/domain-services.ts | FeesService | invoice, createCharge, plans, savePlan, deletePlan, charges, chargePage, batchOptions, chargeSummary, generate, discounts, saveDiscount, deleteDiscount, lateFeeRules, saveLateFeeRule, deleteLateFeeRule |
| src/app/core/supabase/domain-services.ts | PaymentsService | ledgerPage, record, history, historyPage, refund, saveReceiptPath |
| src/app/core/supabase/domain-services.ts | AcademySettingsService | get, save |
| src/app/core/supabase/domain-services.ts | NotificationsService | deliveryAction, list, page, counts, enqueue, markRead, markAllRead, subscribe |
| src/app/core/supabase/domain-services.ts | NotificationTemplatesService | birthdayPreviews, page, save, setStatus |
| src/app/core/supabase/domain-services.ts | AcademyEventsService | page, save, setStatus |
| src/app/core/supabase/domain-services.ts | ReportsService | coaches, attendance, charges, collections |
| src/app/core/supabase/server-list.service.ts | ServerListService | page, all |
| src/app/core/supabase/staff-details.service.ts | StaffDetailsService | activity, attendance, search |
| src/app/core/supabase/storage.service.ts | StorageService | upload, signedUrl, remove |
| src/app/core/supabase/supabase-client.service.ts | SupabaseClientService | requireClient |
| src/app/features/coach/coach-attendance-outbox.service.ts | CoachAttendanceOutboxService | queueCheckIn, queueCheckOut, replay, load, save, operation, list, put, delete, store |
| src/app/features/coach/coach-portal.service.ts | CoachPortalService | load, loadBatches, loadStudents, loadDashboardAttendance, loadSessions, loadNotifications, notificationPage, searchStudents, attendanceHistory, checkIn, checkOut, scan, markBatchPresent, requestAttendanceCorrection, markNotificationRead, markAllNotificationsRead, updateOwnProfile, subscribe, unsubscribe |
| src/app/features/parents/parent-portal.service.ts | ParentPortalService | selectChild, load, subscribe, subscribeToChild, unsubscribe, searchTerm |
| src/app/features/students/student-list.service.ts | StudentListService | getById, list, getStudents, getStudentById, getStudentWorkspace, detailPage, getAttendancePage, getPaymentPage, getDocumentPage, historyPage, createStudent, updateStudent, updateLinkedChildProfile, deleteStudent, summary, update, payload, toError, filters |
| src/app/shared/interaction-dialog/interaction-dialog.service.ts | InteractionDialogService | confirm, prompt, complete |
| src/app/shared/toast/toast.service.ts | ToastService | show, dismiss |

## Lifecycle/architecture review

Student filter and global search subscriptions use takeUntilDestroyed. Coach/parent portals unsubscribe realtime channels, QR stops its camera, several pages clear timers, and table-tools disconnects its observer on destruction. No blanket subscription leak established. Root offline services keep window listeners for application lifetime; account isolation is a distinct risk. Existing list/filter/dialog services already provide reuse. Coach/report views merit decomposition. Exhaustive unused-code and memory-leak profiling was not performed; static scanning cannot prove their absence.
