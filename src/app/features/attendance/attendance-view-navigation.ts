import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { Permission } from '../../core/auth/permissions';

interface AttendanceView {
  label: string;
  icon: string;
  route: string;
  permission: Permission;
}

@Component({
  selector: 'app-attendance-view-navigation',
  imports: [RouterLink, RouterLinkActive],
  template: `
      <nav class="attendance-view-actions" aria-label="Attendance views">
        @for (view of attendanceViews; track view.route) {
        @if (auth.hasPermission(view.permission)) {
        <a [routerLink]="view.route" routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: view.route === '/attendance' }"
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
  protected readonly attendanceViews: readonly AttendanceView[] = [
    { label: 'Dashboard', icon: 'pi-chart-bar', route: '/attendance', permission: 'attendance:read' },
    { label: 'Check In / Check Out', icon: 'pi-qrcode', route: '/attendance/check-in-out', permission: 'attendance:write' },
    { label: 'History & Corrections', icon: 'pi-history', route: '/attendance/history', permission: 'attendance:write' },
    { label: 'Calendar View', icon: 'pi-calendar', route: '/attendance/calendar', permission: 'attendance:write' },
  ];
}
