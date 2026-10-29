import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { NotificationsService } from '../../core/supabase/domain-services';

@Component({
  selector: 'app-notification-entity-filter',
  templateUrl: './notification-entity-filter.html',
  styleUrl: './notification-entity-filter.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationEntityFilter {
  readonly kind = input.required<'student' | 'recipient' | 'batch'>();
  readonly label = input.required<string>();
  readonly value = input('');
  readonly resetVersion = input(0);
  readonly valueChange = output<string>();
  protected readonly search = signal('');
  protected readonly active = signal(false);
  protected readonly refresh = signal(0);
  protected readonly choices = signal<readonly { value: string; label: string }[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal(false);
  private readonly api = inject(NotificationsService);
  private sequence = 0;

  constructor() {
    effect(() => {
      this.resetVersion();
      this.search.set('');
      this.active.set(false);
    });
    effect((cleanup) => {
      const kind = this.kind(),
        selected = this.value(),
        search = this.search();
      const active = this.active();
      this.refresh();
      const sequence = ++this.sequence;
      if (!active && !selected) {
        this.loading.set(false);
        this.error.set(false);
        this.choices.set([]);
        return;
      }
      this.loading.set(true);
      this.error.set(false);
      const timer = setTimeout(async () => {
        try {
          const options = await this.api.filterOptions(kind, search, selected);
          if (sequence === this.sequence) this.choices.set(options);
        } catch {
          if (sequence === this.sequence) {
            this.choices.set([]);
            this.error.set(true);
          }
        } finally {
          if (sequence === this.sequence) this.loading.set(false);
        }
      }, 250);
      cleanup(() => {
        clearTimeout(timer);
        ++this.sequence;
      });
    });
  }
  protected selectedMissing(): boolean {
    return (
      !!this.value() &&
      this.value() !== 'unlinked' &&
      !this.choices().some((option) => option.value === this.value())
    );
  }
}
