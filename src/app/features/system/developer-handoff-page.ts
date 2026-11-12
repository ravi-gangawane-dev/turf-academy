import { PageHero } from '../../shared/page-hero/page-hero';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SettingsNavigation } from '../settings/settings-navigation';

@Component({
  selector: 'app-developer-handoff-page',
  imports: [PageHero, SettingsNavigation],
  templateUrl:'./developer-handoff-page.html',
  styleUrl:'./developer-handoff-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeveloperHandoffPage { }
