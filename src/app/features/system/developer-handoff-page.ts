import { PageHero } from '../../shared/page-hero/page-hero';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SettingsNavigation } from '../settings/settings-navigation';

@Component({
  selector: 'app-developer-handoff-page',
  imports: [PageHero, SettingsNavigation],
  template: `<main class="app-list-page handoff-page">

    <app-page-hero [breadcrumbs]="[{label:'Dashboard',icon:'pi-home',route:'/dashboard'},{label:'Developer Handoff'}]" title="Developer Handoff" subtitle="Implementation conventions and verification entry points for this portal." />
    <app-settings-navigation />
    <section>
      <h2>Project checks</h2>
      <dl>
        <div>
          <dt>Production build</dt>
          <dd><code>npm run build</code></dd>
        </div>
        <div>
          <dt>Unit tests</dt>
          <dd><code>npm test -- --watch=false</code></dd>
        </div>
        <div>
          <dt>Live E2E</dt>
          <dd><code>npx playwright test -c playwright.live.config.ts</code></dd>
        </div>
        <div>
          <dt>Database tests</dt>
          <dd><code>npx supabase test db</code></dd>
        </div>
      </dl>
    </section>
  </main>`,
  styles: [
    `
      :host {
        display: block;
      }
      .handoff-page {
        width: 100%;
        max-width: 1200px;
        margin-inline: auto;
        padding: 0;
        color: #17213b;
      }
      nav {
        font-size: 0.85rem;
        color: #668078;
        margin-bottom: 1.25rem;
      }
      nav a {
        color: #34794b;
        text-decoration: none;
      }
      header,
      section {
        background: #fff;
        border: 1px solid #dce5e1;
        border-radius: 14px;
        padding: 1.5rem;
        margin-bottom: 1rem;
      }
      header p {
        color: #438653;
        font-weight: 700;
        margin: 0 0 0.35rem;
      }
      h1,
      h2 {
        margin: 0.25rem 0;
      }
      header span {
        color: #687871;
      }
      dl {
        display: grid;
        gap: 0.75rem;
        margin-top: 1rem;
      }
      dl div {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        border-bottom: 1px solid #edf1ef;
        padding: 0.75rem 0;
      }
      dt {
        font-weight: 700;
      }
      code {
        background: #f2f6f4;
        border-radius: 5px;
        padding: 0.25rem 0.45rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeveloperHandoffPage { }
