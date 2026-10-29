/**
 * Centralized dialog model.
 * Every dialog in the application is described by a DialogConfig and resolved
 * through a single DialogService. No feature owns dialog markup.
 */

export enum DialogType {
  CONFIRM = 'confirm',
  DELETE = 'delete',
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
  FORM = 'form',
  PROMPT = 'prompt',
  WHATSAPP = 'whatsapp',
  INFORMATION = 'information',
  LOADING = 'loading',
  IMAGE_PREVIEW = 'image-preview',
  SESSION_EXPIRED = 'session-expired',
  PERMISSION = 'permission',
}

export interface DialogFormControl {
  id: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'checkbox';
  placeholder?: string;
  defaultValue?: string | number | boolean;
  options?: readonly { label: string; value: string }[];
  required?: boolean;
  minLength?: number;
  rows?: number;
}

export interface DialogAction {
  name: string;
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  /** Async work executed by the owning feature service, never by the dialog shell. */
  action?: (value?: unknown) => Promise<unknown> | unknown;
  /** A form control rendered in the dialog body instead of a button. */
  control?: DialogFormControl;
}

export interface DialogConfig {
  id?: string;
  type: DialogType;
  title: string;
  message?: string | null;
  size?: 'small' | 'medium' | 'large' | 'full-screen';
  icon?: string;
  showClose?: boolean;
  showCancel?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  okLabel?: string;
  /** Renders a spinner in the primary action and blocks duplicate submits. */
  loading?: boolean;
  /** Blocks Escape, backdrop and the close button while risky work is running. */
  disableClose?: boolean;
  closeOnBackdropClick?: boolean;
  closeOnEsc?: boolean;
  /** Extra context handed to the dialog template (form values, media URLs, ...). */
  data?: unknown;
  fields?: readonly DialogFormControl[];
  actions?: readonly DialogAction[];
  media?: { kind: 'image' | 'video'; src: string; alt?: string };
  /** Preview requests resolve with mocked results and never run actions. */
  preview?: boolean;
  /** Modules that open this dialog; surfaced by the Dialog Playground. */
  usedBy?: readonly string[];
}

export interface DialogResult {
  confirmed: boolean;
  /** 'confirm' | 'ok' | 'cancel' | 'submit' | 'close' */
  action: string;
  value?: unknown;
  type: DialogType;
  preview?: boolean;
}

export interface DialogRequest {
  id: string;
  config: DialogConfig;
  busy: boolean;
  resolve: (result: DialogResult) => void;
}
