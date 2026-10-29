import { Injectable, computed, signal } from '@angular/core';
import {
  DialogConfig,
  DialogFormControl,
  DialogRequest,
  DialogResult,
  DialogType,
} from './models/dialog-config.model';

let sequence = 0;

/**
 * The one dialog service used by the whole application.
 *
 * Feature code opens dialogs here and keeps its business logic in its own
 * service; the dialog shell only renders the config and returns a result.
 */
@Injectable({ providedIn: 'root' })
export class DialogService {
  private readonly stack = signal<readonly DialogRequest[]>([]);
  private readonly pending = new Map<string, Promise<DialogResult>>();

  readonly requests = this.stack.asReadonly();
  readonly active = computed<DialogRequest | null>(() => {
    const open = this.stack();
    return open.length ? open[open.length - 1] : null;
  });
  readonly isOpen = computed(() => this.stack().length > 0);

  /**
   * Open a dialog with a fully typed config.
   * A repeated `id` reuses the in-flight dialog instead of stacking a duplicate.
   */
  open(config: DialogConfig): Promise<DialogResult> {
    const id = config.id ?? `${config.type}-${++sequence}`;
    const existing = this.pending.get(id);
    if (existing) return existing;

    const promise = new Promise<DialogResult>((resolve) => {
      const request: DialogRequest = {
        id,
        config: { size: 'medium', showClose: true, ...config },
        busy: false,
        resolve: (result) => {
          this.pending.delete(id);
          resolve(result);
        },
      };
      this.stack.update((open) => [...open, request]);
    });
    this.pending.set(id, promise);
    return promise;
  }

  /** Confirmation dialog; resolves true only when the user confirms. */
  confirm(
    config:
      | string
      | {
          title?: string;
          message: string;
          confirmLabel?: string;
          cancelLabel?: string;
          type?: DialogType;
          preview?: boolean;
          usedBy?: readonly string[];
        },
  ): Promise<boolean> {
    const options = typeof config === 'string' ? { message: config } : config;
    return this.open({
      type: options.type ?? DialogType.CONFIRM,
      title: options.title ?? 'Confirm action',
      message: options.message,
      confirmLabel: options.confirmLabel ?? 'Confirm',
      cancelLabel: options.cancelLabel ?? 'Cancel',
      preview: options.preview,
      usedBy: options.usedBy,
    }).then((result) => result.confirmed);
  }

  /** Destructive confirmation; uses the danger action styling. */
  delete(config: {
    title?: string;
    message: string;
    confirmLabel?: string;
    preview?: boolean;
    usedBy?: readonly string[];
  }): Promise<boolean> {
    return this.confirm({
      ...config,
      type: DialogType.DELETE,
      title: config.title ?? 'Delete record?',
      confirmLabel: config.confirmLabel ?? 'Delete',
    });
  }

  alert(message: string, title = 'Alert', preview = false): Promise<void> {
    return this.open({
      type: DialogType.INFO,
      title,
      message,
      preview,
      showCancel: false,
      confirmLabel: 'OK',
    }).then(() => undefined);
  }

  success(message: string, title = 'Success', preview = false): Promise<void> {
    return this.open({
      type: DialogType.SUCCESS,
      title,
      message,
      preview,
      showCancel: false,
      confirmLabel: 'OK',
    }).then(() => undefined);
  }

  warning(message: string, title = 'Warning', preview = false): Promise<void> {
    return this.open({
      type: DialogType.WARNING,
      title,
      message,
      preview,
      showCancel: false,
      confirmLabel: 'OK',
    }).then(() => undefined);
  }

  error(message: string, title = 'Something went wrong', preview = false): Promise<void> {
    return this.open({
      type: DialogType.ERROR,
      title,
      message,
      preview,
      showCancel: false,
      confirmLabel: 'Close',
    }).then(() => undefined);
  }

  info(message: string, title = 'Information', preview = false): Promise<void> {
    return this.alert(message, title, preview);
  }

  prompt(config: {
    title?: string;
    message: string;
    value?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    preview?: boolean;
  }): Promise<string | null> {
    return this.open({
      type: DialogType.PROMPT,
      title: config.title ?? 'Enter details',
      message: config.message,
      confirmLabel: config.confirmLabel ?? 'Continue',
      cancelLabel: config.cancelLabel ?? 'Cancel',
      preview: config.preview,
      fields: [
        {
          id: 'response',
          label: 'Response',
          type: 'text',
          defaultValue: config.value ?? '',
        },
      ],
    }).then((result) =>
      result.confirmed && typeof result.value === 'string' ? result.value : null,
    );
  }

  /** Form dialog. `onSubmit` is the owning feature's save handler. */
  form(config: {
    title: string;
    message?: string;
    fields: readonly DialogFormControl[];
    submitLabel?: string;
    cancelLabel?: string;
    data?: unknown;
    preview?: boolean;
    usedBy?: readonly string[];
    onSubmit?: (value: Record<string, unknown>) => Promise<unknown> | unknown;
  }): Promise<DialogResult> {
    return this.open({
      type: DialogType.FORM,
      title: config.title,
      message: config.message,
      size: 'large',
      fields: config.fields,
      data: config.data,
      preview: config.preview,
      usedBy: config.usedBy,
      confirmLabel: config.submitLabel ?? 'Save',
      cancelLabel: config.cancelLabel ?? 'Cancel',
      actions: config.onSubmit
        ? [{ name: 'submit', label: config.submitLabel ?? 'Save', action: config.onSubmit as (value?: unknown) => unknown }]
        : undefined,
    });
  }

  mediaPreview(config: {
    title: string;
    message?: string;
    media: { kind: 'image' | 'video'; src: string; alt?: string };
    preview?: boolean;
  }): Promise<DialogResult> {
    return this.open({
      type: DialogType.IMAGE_PREVIEW,
      title: config.title,
      message: config.message,
      media: config.media,
      size: 'large',
      preview: config.preview,
      showCancel: false,
      confirmLabel: 'Close',
    });
  }

  /** Mark the active dialog busy; the primary action is disabled while busy. */
  setBusy(busy: boolean): void {
    this.stack.update((open) =>
      open.map((request, index) =>
        index === open.length - 1 ? { ...request, busy } : request,
      ),
    );
  }

  /** Resolve the active dialog. */
  close(action = 'close', value?: unknown): void {
    const open = this.stack();
    const request = open[open.length - 1];
    if (!request) return;
    this.stack.set(open.slice(0, -1));
    request.resolve({
      confirmed: action === 'confirm' || action === 'ok' || action === 'submit',
      action,
      value,
      type: request.config.type,
      preview: request.config.preview,
    });
  }

  /** Resolve every open dialog as cancelled. */
  closeAll(): void {
    const open = this.stack();
    this.stack.set([]);
    for (const request of [...open].reverse()) {
      request.resolve({
        confirmed: false,
        action: 'cancel',
        type: request.config.type,
        preview: request.config.preview,
      });
    }
  }

  /**
   * Run the configured action for a request.
   * Preview requests never execute feature actions, so the playground cannot
   * mutate Supabase data, delete records or send WhatsApp messages.
   */
  async runAction(request: DialogRequest, actionName: string, value?: unknown): Promise<void> {
    const action = request.config.actions?.find((item) => item.name === actionName);
    if (request.config.preview) {
      this.setBusy(false);
      return;
    }
    if (!action?.action) return;
    this.setBusy(true);
    try {
      await action.action(value);
    } finally {
      this.setBusy(false);
    }
  }
}
