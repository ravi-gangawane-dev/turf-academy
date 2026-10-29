import { PageHero } from '../../shared/page-hero/page-hero';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-design-system-page',
  imports: [PageHero],
  template: `<main class="app-list-page library-page">

    <app-page-hero [breadcrumbs]="[{label:'Dashboard',icon:'pi-home',route:'/dashboard'},{label:'Design System'}]" title="Design System" subtitle="Reusable foundations and interface patterns used by the academy portal." />
    <!-- <app-settings-navigation /> -->
    <section>
      <h2>Available foundations</h2>
      <div class="grid">
        <article>
          <i class="pi pi-palette"></i>
          <h3>Colors and typography</h3>
          <p>Brand colors, type hierarchy, spacing and responsive layout tokens.</p>
        </article>
        <article>
          <i class="pi pi-th-large"></i>
          <h3>Components</h3>
          <p>Cards, tables, dialogs, badges, filters, pagination and feedback patterns.</p>
        </article>
        <article>
          <i class="pi pi-check-circle"></i>
          <h3>Accessibility</h3>
          <p>Keyboard interaction, focus treatment, semantic markup and contrast guidance.</p>
        </article>
      </div>
    </section>
  </main>`,
  styles: [
    `
      :host {
        display: block;
      }
      .library-page {
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
      h2,
      h3 {
        margin: 0.25rem 0;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 1rem;
        margin-top: 1rem;
      }
      article {
        border: 1px solid #e2e9e6;
        border-radius: 10px;
        padding: 1rem;
      }
      article i {
        color: #438653;
        font-size: 1.4rem;
      }
      article p,
      header span {
        color: #687871;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesignSystemPage { }
