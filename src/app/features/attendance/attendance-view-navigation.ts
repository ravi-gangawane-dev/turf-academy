import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { Permission } from '../../core/auth/permissions';

interface AttendanceView {
  label: string;
  icon: string;
  route: string;
  permission: Permission;
  exact?: boolean;
}

@Component({
  selector: 'app-attendance-view-navigation',
  imports: [RouterLink, RouterLinkActive],
  template: `
      <nav class="attendance-view-actions" aria-label="Attendance views">
        @for (view of attendanceViews(); track view.route) {
        @if (auth.hasPermission(view.permission)) {
        <a [routerLink]="view.route" routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: view.exact ?? false }"
          ariaCurrentWhenActive="page">
          <i [class]="'pi ' + view.icon" aria-hidden="true"></i>
          {{ view.label }}
        </a>
        }
        }
      </nav>
  `,
  styleUrl: './attendance-view-navigation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceViewNavigation {
  protected readonly auth = inject(AuthService);
  readonly coachMode = input(false);
  protected readonly attendanceViews = computed<readonly AttendanceView[]>(() =>
    this.coachMode()
      ? [
          { label: 'Today', icon: 'pi-chart-bar', route: '/coach/attendance', permission: 'coach:portal', exact: true },
          { label: 'Check In / Check Out', icon: 'pi-qrcode', route: '/coach/attendance/check-in-out', permission: 'coach:portal' },
          { label: 'History', icon: 'pi-history', route: '/coach/attendance/history', permission: 'coach:portal' },
          { label: 'Correction', icon: 'pi-pencil', route: '/coach/attendance/correction', permission: 'coach:portal' },
          { label: 'Attendance Summary', icon: 'pi-chart-bar', route: '/coach/attendance/summary', permission: 'coach:portal' },
        ]
      : [
          { label: 'Dashboard', icon: 'pi-chart-bar', route: '/attendance', permission: 'attendance:read', exact: true },
          { label: 'Check In / Check Out', icon: 'pi-qrcode', route: '/attendance/check-in-out', permission: 'attendance:write' },
          { label: 'History & Corrections', icon: 'pi-history', route: '/attendance/history', permission: 'attendance:write' },
          { label: 'Calendar View', icon: 'pi-calendar', route: '/attendance/calendar', permission: 'attendance:write' },
        ],
  );
}
