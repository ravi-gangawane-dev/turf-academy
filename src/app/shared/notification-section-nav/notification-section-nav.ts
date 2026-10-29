import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-notification-section-nav',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './notification-section-nav.html',
  styleUrl: './notification-section-nav.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationSectionNav {
  readonly showTemplates = input(false);
}
