import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const variants: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {};
for (const status of ['active', 'paid', 'present', 'on_time', 'checked_in', 'checked_out', 'successful', 'success', 'delivered', 'completed', 'synced', 'accepted']) variants[status] = 'success';
for (const status of ['pending', 'partial', 'partially_paid', 'partially_refunded', 'late', 'paused', 'queued', 'sent', 'sending', 'processing', 'syncing', 'waiting', 'retrying']) variants[status] = 'warning';
for (const status of ['failed', 'cancelled', 'canceled', 'inactive', 'overdue', 'refunded', 'absent', 'suspended', 'conflict', 'rejected', 'revoked']) variants[status] = 'danger';

@Component({
  selector: 'app-status-badge',
  template: `<span [class]="variant()"><i aria-hidden="true" class="pi" [class.pi-check-circle]="variant()==='success'" [class.pi-exclamation-circle]="variant()==='danger'"></i>{{label()}}</span>`,
  styles: [':host{display:inline-block}span{display:inline-flex;align-items:center;gap:.3rem;padding:4px 9px;border-radius:999px;background:var(--app-surface-muted);color:var(--app-muted);font-size:var(--app-fs-meta);font-weight:600;line-height:1.4;text-transform:capitalize}.success{background:var(--app-success-bg);color:var(--app-success-text)}.warning{background:color-mix(in srgb,var(--app-warning) 12%,var(--app-card));color:var(--app-warning)}.danger{background:var(--app-danger-bg);color:var(--app-danger)}.info{background:color-mix(in srgb,var(--app-info) 12%,var(--app-card));color:var(--app-info)}'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadge {
  readonly status = input.required<string>();
  /** Overrides the derived text, e.g. "Not invited" for an absent status. */
  readonly text = input('');
  private readonly normalized = computed(() => (this.status() || '').trim().toLowerCase().replace(/[\s-]+/g, '_'));
  readonly label = computed(() => this.text() || this.normalized().replaceAll('_', ' ') || 'Unknown');
  readonly variant = computed(() => variants[this.normalized()] ?? 'info');
}
