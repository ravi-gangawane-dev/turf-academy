import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface PageHeroBreadcrumb {
  readonly label: string;
  readonly icon?: string;
  readonly route?: string;
}

@Component({
  selector: 'app-page-hero',
  imports: [RouterLink],
  templateUrl: './page-hero.html',
  styleUrl: './page-hero.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHero {
  readonly title = input.required<string>();
  readonly subtitle = input('');
  readonly breadcrumbs = input<readonly PageHeroBreadcrumb[]>([]);
  readonly actionLabel = input<string>('');
  readonly actionIcon = input('pi-plus');
  readonly actionDisabled = input(false);
  readonly actionLoading = input(false);
  readonly actionLoadingLabel = input('Working...');
  readonly eyebrow = input('');
  readonly quote = input('');
  readonly brandName = input('');
  readonly action = output<void>();
  readonly breadcrumbSelected = output<string>();
}
