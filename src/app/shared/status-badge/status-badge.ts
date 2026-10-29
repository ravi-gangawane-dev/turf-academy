import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const variants: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {};
for (const status of ['active', 'paid', 'present', 'on_time', 'checked_in', 'checked_out', 'successful', 'success', 'delivered', 'completed', 'synced']) variants[status] = 'success';
for (const status of ['pending', 'partial', 'partially_paid', 'partially_refunded', 'late', 'paused', 'queued', 'sent', 'sending', 'processing', 'syncing', 'waiting', 'retrying']) variants[status] = 'warning';
for (const status of ['failed', 'cancelled', 'canceled', 'inactive', 'overdue', 'refunded', 'absent', 'suspended', 'conflict', 'rejected']) variants[status] = 'danger';

@Component({
  selector: 'app-status-badge',
  template: `<span [class]="variant()"><i aria-hidden="true" class="pi" [class.pi-check-circle]="variant()==='success'" [class.pi-exclamation-circle]="variant()==='danger'"></i>{{label()}}</span>`,
  styles: [':host{display:inline-block}span{display:inline-flex;align-items:center;gap:.3rem;padding:.25rem .55rem;border-radius:99px;background:#eef1ef;color:#45514b;text-transform:capitalize}.success{background:#e6f5eb;color:#216c3c}.warning{background:#fff4d8;color:#8a6100}.danger{background:#fdeaea;color:#a52d2d}.info{background:#e8f1fb;color:#265f99}'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadge {
  readonly status = input.required<string>();
  private readonly normalized = computed(() => (this.status() || '').trim().toLowerCase().replace(/[\s-]+/g, '_'));
  readonly label = computed(() => this.normalized().replaceAll('_', ' ') || 'Unknown');
  readonly variant = computed(() => variants[this.normalized()] ?? 'info');
}
