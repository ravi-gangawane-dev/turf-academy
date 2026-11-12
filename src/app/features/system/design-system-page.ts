import { PageHero } from '../../shared/page-hero/page-hero';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-design-system-page',
  imports: [PageHero],
  templateUrl:'./design-system-page.html',
  styleUrl:'./design-system-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesignSystemPage { }
