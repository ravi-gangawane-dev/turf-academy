import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { API_CONFIG } from '../core/config/api.config';

@Component({
  selector: 'app-academy-support',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section aria-label="Academy support">
    @if (support; as contact) {
      @if (contact.phone) {
        <a [href]="'tel:' + contact.phone"
          ><i class="pi pi-phone" aria-hidden="true"></i><strong>Call academy</strong
          ><span>{{ contact.displayPhone || contact.phone }}</span></a
        >
      }
      @if (contact.email) {
        <a [href]="'mailto:' + contact.email"
          ><i class="pi pi-envelope" aria-hidden="true"></i><strong>Email academy</strong
          ><span>{{ contact.email }}</span></a
        >
      }
      @if (contact.whatsapp) {
        <a [href]="'https://wa.me/' + contact.whatsapp" target="_blank" rel="noopener"
          ><i class="pi pi-whatsapp" aria-hidden="true"></i><strong>WhatsApp</strong
          ><span>Chat with support</span></a
        >
      }
      @if (contact.hours) {
        <article>
          <i class="pi pi-clock" aria-hidden="true"></i><strong>Support hours</strong
          ><span>{{ contact.hours }}</span>
        </article>
      }
    } @else {
      <p>Contact the academy office for assistance.</p>
    }
  </section>`,
  styles: [
    `
      section {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr));
        gap: 16px;
      }
      a,
      article {
        display: grid;
        gap: 12px;
        padding: 24px;
        border: 1px solid #dce8e2;
        border-radius: 12px;
        background: white;
        color: inherit;
        text-decoration: none;
        overflow-wrap: anywhere;
      }
      i {
        color: #08713b;
        font-size: 24px;
      }
      span {
        color: var(--app-muted);
      }
      a:focus-visible {
        outline: 2px solid #08713b;
        outline-offset: 3px;
      }
    `,
  ],
})
export class AcademySupport {
  protected readonly support = inject(API_CONFIG).academySupport;
}
