import { Injectable, signal, untracked } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  readonly id: string;
  readonly kind: ToastKind;
  readonly text: string;
  readonly duration: number;
}

/** Default lifetime per kind: errors stay long enough to be read and acted on. */
const DURATIONS: Record<ToastKind, number> = {
  success: 4000,
  info: 5000,
  warning: 6000,
  error: 8000,
};

/** Older toasts are dropped so the corner never covers the page. */
const MAX_VISIBLE = 4;

/**
 * Single source of truth for transient feedback. Any component can raise a
 * toast without owning markup: the ToastHost rendered once in the app shell
 * displays it. Page-level action results (save, delete, invite, login, API
 * failure) belong here; inline elements stay for field validation, load and
 * empty states, and dialogs whose message must sit next to the form.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly messages = signal<readonly ToastMessage[]>([]);
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly remaining = new Map<string, number>();
  private readonly startedAt = new Map<string, number>();

  success(text: string, duration = DURATIONS.success): void {
    this.show(text, 'success', duration);
  }

  error(text: string, duration = DURATIONS.error): void {
    this.show(text, 'error', duration);
  }

  warning(text: string, duration = DURATIONS.warning): void {
    this.show(text, 'warning', duration);
  }

  info(text: string, duration = DURATIONS.info): void {
    this.show(text, 'info', duration);
  }

  show(text: string, kind: ToastKind = 'info', duration = DURATIONS[kind]): void {
    const message = String(text ?? '').trim();
    if (!message) return;
    // De-duplicate: a repeated message refreshes the visible toast instead of
    // stacking an identical one (e.g. double-clicking a failing action).
    // Callers may publish feedback from an effect. Queue changes must not
    // retrigger that effect and recreate a dismissed or expired notification.
    const messages = untracked(this.messages);
    const duplicate = messages.find((item) => item.kind === kind && item.text === message);
    if (duplicate) {
      this.restart(duplicate);
      return;
    }
    const toast: ToastMessage = { id: this.id(), kind, text: message, duration };
    const next = [...messages, toast];
    if (next.length > MAX_VISIBLE) {
      for (const dropped of next.slice(0, next.length - MAX_VISIBLE)) this.clearTimer(dropped.id);
    }
    this.messages.set(next.slice(-MAX_VISIBLE));
    this.start(toast);
  }

  dismiss(id: string): void {
    this.clearTimer(id);
    this.messages.update((items) => items.filter((item) => item.id !== id));
  }

  clear(): void {
    for (const id of this.timers.keys()) this.clearTimer(id);
    this.messages.set([]);
  }

  /** Hovering a toast pauses its timer so long errors can be read. */
  pause(id: string): void {
    const timeout = this.timers.get(id);
    if (!timeout) return;
    const started = this.startedAt.get(id) ?? Date.now();
    const message = this.messages().find((item) => item.id === id);
    if (!message) return;
    this.remaining.set(id, Math.max(0, (this.remaining.get(id) ?? message.duration) - (Date.now() - started)));
    this.clearTimer(id);
  }

  resume(id: string): void {
    const message = this.messages().find((item) => item.id === id);
    if (!message || this.timers.has(id)) return;
    const remaining = this.remaining.get(id) ?? message.duration;
    this.startedAt.set(id, Date.now());
    this.timers.set(id, setTimeout(() => this.dismiss(id), remaining));
  }

  private restart(toast: ToastMessage): void {
    const started = this.startedAt.get(toast.id) ?? Date.now();
    this.remaining.set(toast.id, Math.max(0, (this.remaining.get(toast.id) ?? toast.duration) - (Date.now() - started)));
    this.clearTimer(toast.id);
    this.startedAt.set(toast.id, Date.now());
    this.timers.set(toast.id, setTimeout(() => this.dismiss(toast.id), toast.duration));
    this.remaining.set(toast.id, toast.duration);
  }

  private start(toast: ToastMessage): void {
    this.startedAt.set(toast.id, Date.now());
    this.remaining.set(toast.id, toast.duration);
    this.timers.set(toast.id, setTimeout(() => this.dismiss(toast.id), toast.duration));
  }

  private clearTimer(id: string): void {
    const timeout = this.timers.get(id);
    if (timeout) clearTimeout(timeout);
    this.timers.delete(id);
  }

  private id(): string {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}
