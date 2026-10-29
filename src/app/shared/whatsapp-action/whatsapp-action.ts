import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AttendanceWhatsApp, WhatsappService } from '../../core/services/whatsapp.service';

/**
 * Post-attendance WhatsApp action. Shows the prepared message and only opens WhatsApp
 * after staff choose to; it never sends automatically and never claims delivery.
 */
@Component({
  selector: 'app-whatsapp-action',
  imports: [RouterLink],
  templateUrl: './whatsapp-action.html',
  styleUrl: './whatsapp-action.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WhatsappAction {
  readonly message = input<AttendanceWhatsApp | null>(null);
  readonly studentId = input('');
  readonly studentName = input('');
  readonly preparationError = input('');
  private readonly whatsapp = inject(WhatsappService);
  protected readonly error = signal('');
  private readonly openedMessage = signal<AttendanceWhatsApp | null>(null);
  protected readonly opened = computed(() => !!this.message() && this.openedMessage() === this.message());
  protected readonly preview = computed(() => {
    const data = this.message();
    if (!data) return '';
    try {
      return this.whatsapp.createMessage(data);
    } catch (error) {
      return error instanceof Error ? error.message : 'Message could not be prepared.';
    }
  });
  /** Invalid numbers are reported before the button is used, not after a failed click. */
  protected readonly recipientError = computed(() => {
    const data = this.message();
    if (!data) return '';
    try {
      this.whatsapp.createLink(data);
      return '';
    } catch (error) {
      return error instanceof Error ? error.message : 'Parent phone number is not valid.';
    }
  });

  protected open(): void {
    const data = this.message();
    if (!data) return;
    this.error.set('');
    try {
      this.whatsapp.openWhatsApp(data);
      this.openedMessage.set(data);
    } catch (error) {
      console.error('Attendance WhatsApp could not be opened', error);
      this.error.set(
        error instanceof Error ? error.message : 'WhatsApp could not be opened.',
      );
    }
  }
}
