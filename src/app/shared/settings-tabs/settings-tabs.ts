import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SectionTab, SectionTabs } from '../section-tabs/section-tabs';

/** The one settings tab bar. Every settings page renders this so the tabs stay identical. */
export const SETTINGS_TABS: readonly SectionTab[] = [
  { label: 'All Settings', path: '/settings' },
  { label: 'Profile', path: '/settings/profile' },
  { label: 'Operations', path: '/settings/operations' },
  { label: 'Attendance', path: '/settings/attendance' },
  { label: 'Notifications', path: '/settings/notifications' },
  { label: 'Print & Documents', path: '/settings/print' },
  { label: 'Users & Roles', path: '/settings/users' },
  { label: 'Audit Log', path: '/settings/audit-logs' },
  { label: 'Tools & Data', path: '/settings/tools' },
];

@Component({
  selector: 'app-settings-tabs',
  imports: [SectionTabs],
  template: `<app-section-tabs [tabs]="tabs" ariaLabel="Settings sections" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsTabs {
  protected readonly tabs = SETTINGS_TABS;
}
