import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-async-state',
  templateUrl: './async-state.html',
  styleUrl: './async-state.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AsyncState {
  readonly kind = input<'loading' | 'error' | 'empty'>('loading');
  readonly title = input.required<string>();
  readonly message = input('');
  readonly actionLabel = input('');
  readonly action = output<void>();
}
