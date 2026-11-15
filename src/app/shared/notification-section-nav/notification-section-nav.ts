import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SectionTab, SectionTabs } from '../section-tabs/section-tabs';

@Component({
  selector: 'app-notification-section-nav',
  imports: [SectionTabs],
  template: `<app-section-tabs [tabs]="tabs()" ariaLabel="Notification views" />`,
  styleUrl: './notification-section-nav.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationSectionNav {
  readonly showTemplates = input(false);

  protected readonly tabs = computed<readonly SectionTab[]>(() => [
    { label: 'Management', path: '/notifications', icon: 'pi-inbox' },
    ...(this.showTemplates()
      ? [{ label: 'Templates', path: '/notifications/templates', icon: 'pi-file-edit' }]
      : []),
    { label: 'Events & Holidays', path: '/notifications/events', icon: 'pi-calendar' },
  ]);
}
