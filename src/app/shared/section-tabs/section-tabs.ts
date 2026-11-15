import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';

export interface SectionTab {
  label: string;
  path: string;
  icon?: string;
}

/** The one tab view. Every section navigation renders this so the tabs look and align identically. */
@Component({
  selector: 'app-section-tabs',
  imports: [RouterLink],
  template: `
    <nav class="section-tabs" [attr.aria-label]="ariaLabel()">
      @for (tab of tabs(); track tab.path) {
        <a
          [routerLink]="tab.path"
          [class.active]="isActive(tab.path)"
          [attr.aria-current]="isActive(tab.path) ? 'page' : null"
        >
          @if (tab.icon) {
            <i [class]="'pi ' + tab.icon" aria-hidden="true"></i>
          }
          {{ tab.label }}
        </a>
      }
    </nav>
  `,
  styleUrl: './section-tabs.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionTabs {
  private readonly router = inject(Router);

  readonly tabs = input.required<readonly SectionTab[]>();
  readonly ariaLabel = input('Section tabs');
  /** Optional override for views that live on one path and switch through a query parameter. */
  readonly activePath = input<string | null>(null);

  private readonly currentPath = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects.split('?')[0].split('#')[0]),
    ),
    { initialValue: this.router.url.split('?')[0].split('#')[0] },
  );

  protected isActive(path: string): boolean {
    const override = this.activePath();
    return override ? override === path : this.currentPath() === path;
  }
}
