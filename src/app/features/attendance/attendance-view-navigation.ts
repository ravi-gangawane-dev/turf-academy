import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { Permission } from '../../core/auth/permissions';
import { SectionTab, SectionTabs } from '../../shared/section-tabs/section-tabs';

interface AttendanceView extends SectionTab {
  permission: Permission;
}

@Component({
  selector: 'app-attendance-view-navigation',
  imports: [SectionTabs],
  template: `<app-section-tabs [tabs]="visibleViews()" ariaLabel="Attendance views" />`,
  styleUrl: './attendance-view-navigation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceViewNavigation {
  protected readonly auth = inject(AuthService);
  readonly coachMode = input(false);

  private readonly attendanceViews = computed<readonly AttendanceView[]>(() =>
    this.coachMode()
      ? [
          { label: 'Today', icon: 'pi-chart-bar', path: '/coach/attendance', permission: 'coach:portal' },
          { label: 'Check In / Check Out', icon: 'pi-qrcode', path: '/coach/attendance/check-in-out', permission: 'coach:portal' },
          { label: 'History', icon: 'pi-history', path: '/coach/attendance/history', permission: 'coach:portal' },
          { label: 'Correction', icon: 'pi-pencil', path: '/coach/attendance/correction', permission: 'coach:portal' },
          { label: 'Attendance Summary', icon: 'pi-chart-bar', path: '/coach/attendance/summary', permission: 'coach:portal' },
        ]
      : [
          { label: 'Dashboard', icon: 'pi-chart-bar', path: '/attendance', permission: 'attendance:read' },
          { label: 'Check In / Check Out', icon: 'pi-qrcode', path: '/attendance/check-in-out', permission: 'attendance:write' },
          { label: 'History', icon: 'pi-history', path: '/attendance/history', permission: 'attendance:write' },
          { label: 'Correction List', icon: 'pi-pencil', path: '/attendance/correction', permission: 'attendance:write' },
          { label: 'Calendar View', icon: 'pi-calendar', path: '/attendance/calendar', permission: 'attendance:write' },
        ],
  );

  protected readonly visibleViews = computed<readonly SectionTab[]>(() =>
    this.attendanceViews()
      .filter((view) => this.auth.hasPermission(view.permission))
      .map(({ label, path, icon }) => ({ label, path, icon })),
  );
}
