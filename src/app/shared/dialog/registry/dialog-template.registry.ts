import { DialogConfig, DialogType } from '../models/dialog-config.model';

export interface DialogRegistryEntry {
  /** Stable identifier used by the registry and the Dialog Playground. */
  type: DialogType;
  name: string;
  description: string;
  category: 'confirmation' | 'feedback' | 'form' | 'media' | 'system';
  /** Shared template component that renders this dialog. */
  component: 'ConfirmationDialog' | 'MessageDialog' | 'FormDialog' | 'MediaPreviewDialog';
  /** Real application modules that open this dialog. */
  usedBy: readonly string[];
  defaultConfig: DialogConfig;
}

const confirmUsedBy = [
  'Students',
  'Parents',
  'Coaches',
  'Batches',
  'Enrollments',
  'Fees',
  'Reports',
  'Coach portal',
  'Settings',
];

/**
 * Single registry of every reusable dialog in the application.
 * The Dialog Playground renders this list and previews through DialogService,
 * so a preview is always the production component with production config.
 */
export const DIALOG_TEMPLATE_REGISTRY: readonly DialogRegistryEntry[] = [
  {
    type: DialogType.CONFIRM,
    name: 'Confirmation',
    description: 'Generic yes/no confirmation before an action.',
    category: 'confirmation',
    component: 'ConfirmationDialog',
    usedBy: confirmUsedBy,
    defaultConfig: {
      type: DialogType.CONFIRM,
      title: 'Confirm action',
      message: 'Are you sure you want to continue?',
      confirmLabel: 'Confirm',
      cancelLabel: 'Cancel',
    },
  },
  {
    type: DialogType.DELETE,
    name: 'Delete confirmation',
    description: 'Destructive confirmation with a red primary action.',
    category: 'confirmation',
    component: 'ConfirmationDialog',
    usedBy: ['Students', 'Parents', 'Coaches', 'Batches', 'Fee plans', 'Fee rules'],
    defaultConfig: {
      type: DialogType.DELETE,
      title: 'Delete record?',
      message: 'This permanently removes the record and its related data.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
    },
  },
  {
    type: DialogType.WHATSAPP,
    name: 'WhatsApp confirmation',
    description: 'Confirms sending an attendance message to a guardian.',
    category: 'confirmation',
    component: 'ConfirmationDialog',
    usedBy: ['Attendance'],
    defaultConfig: {
      type: DialogType.WHATSAPP,
      title: 'WhatsApp Confirmation',
      message:
        'Preview:\n\nAarav Sharma has checked in at Turf Cricket Academy at 09:30 AM.\n\nParent phone: +91 98765 43210\n\nOpen WhatsApp and send this message?',
      confirmLabel: 'Open WhatsApp',
      cancelLabel: 'Cancel',
    },
  },
  {
    type: DialogType.SUCCESS,
    name: 'Success',
    description: 'Confirms a completed operation.',
    category: 'feedback',
    component: 'MessageDialog',
    usedBy: [],
    defaultConfig: {
      type: DialogType.SUCCESS,
      title: 'Saved',
      message: 'The changes were saved successfully.',
      confirmLabel: 'OK',
      showCancel: false,
    },
  },
  {
    type: DialogType.WARNING,
    name: 'Warning',
    description: 'Non-blocking warning before continuing.',
    category: 'feedback',
    component: 'MessageDialog',
    usedBy: [],
    defaultConfig: {
      type: DialogType.WARNING,
      title: 'Heads up',
      message: 'Batch capacity will be exceeded if you continue.',
      confirmLabel: 'OK',
      showCancel: false,
    },
  },
  {
    type: DialogType.ERROR,
    name: 'Error',
    description: 'Blocking failure message with a recovery hint.',
    category: 'feedback',
    component: 'MessageDialog',
    usedBy: [],
    defaultConfig: {
      type: DialogType.ERROR,
      title: 'Something went wrong',
      message: 'The payment could not be recorded. Check the connection and try again.',
      confirmLabel: 'Close',
      showCancel: false,
    },
  },
  {
    type: DialogType.INFO,
    name: 'Information',
    description: 'Plain information message with a single action.',
    category: 'feedback',
    component: 'MessageDialog',
    usedBy: ['Reports'],
    defaultConfig: {
      type: DialogType.INFO,
      title: 'Information',
      message: 'Report details are generated from the current filters.',
      confirmLabel: 'OK',
      showCancel: false,
    },
  },
  {
    type: DialogType.LOADING,
    name: 'Loading',
    description: 'Blocks interaction while a long operation runs.',
    category: 'system',
    component: 'MessageDialog',
    usedBy: [],
    defaultConfig: {
      type: DialogType.LOADING,
      title: 'Working',
      message: 'Preparing the export. This can take a few seconds.',
      confirmLabel: 'Close',
      showCancel: false,
      disableClose: true,
    },
  },
  {
    type: DialogType.SESSION_EXPIRED,
    name: 'Session expired',
    description: 'Prompts the user to sign in again.',
    category: 'system',
    component: 'ConfirmationDialog',
    usedBy: [],
    defaultConfig: {
      type: DialogType.SESSION_EXPIRED,
      title: 'Session expired',
      message: 'Your session has ended. Sign in again to continue.',
      confirmLabel: 'Sign in',
      cancelLabel: 'Cancel',
    },
  },
  {
    type: DialogType.PERMISSION,
    name: 'Permission',
    description: 'Explains a required device permission.',
    category: 'system',
    component: 'ConfirmationDialog',
    usedBy: [],
    defaultConfig: {
      type: DialogType.PERMISSION,
      title: 'Camera permission',
      message: 'Camera access is required for QR check-in and profile photos.',
      confirmLabel: 'Continue',
      cancelLabel: 'Cancel',
    },
  },
  {
    type: DialogType.FORM,
    name: 'Form',
    description: 'Reactive form dialog with validation and a submit action.',
    category: 'form',
    component: 'FormDialog',
    usedBy: [],
    defaultConfig: {
      type: DialogType.FORM,
      title: 'Edit student',
      message: 'Update the student details and save.',
      size: 'large',
      confirmLabel: 'Save',
      cancelLabel: 'Cancel',
      fields: [
        { id: 'fullName', label: 'Full name', type: 'text', required: true, defaultValue: 'Aarav Sharma' },
        { id: 'phone', label: 'Phone', type: 'text', placeholder: '+91 98765 43210' },
        {
          id: 'batch',
          label: 'Batch',
          type: 'select',
          defaultValue: 'u12',
          options: [
            { label: 'Under 12', value: 'u12' },
            { label: 'Under 16', value: 'u16' },
          ],
        },
        { id: 'notes', label: 'Notes', type: 'textarea', rows: 3 },
      ],
    },
  },
  {
    type: DialogType.PROMPT,
    name: 'Prompt',
    description: 'Single-field text prompt.',
    category: 'form',
    component: 'FormDialog',
    usedBy: [],
    defaultConfig: {
      type: DialogType.PROMPT,
      title: 'Enter details',
      message: 'Add a note for this attendance correction.',
      confirmLabel: 'Continue',
      cancelLabel: 'Cancel',
      fields: [{ id: 'response', label: 'Response', type: 'text' }],
    },
  },
  {
    type: DialogType.IMAGE_PREVIEW,
    name: 'Image preview',
    description: 'Full-size receipt or profile photo preview.',
    category: 'media',
    component: 'MediaPreviewDialog',
    usedBy: [],
    defaultConfig: {
      type: DialogType.IMAGE_PREVIEW,
      title: 'Receipt preview',
      message: 'Payment receipt for March 2026.',
      size: 'large',
      confirmLabel: 'Close',
      showCancel: false,
      media: { kind: 'image', src: 'branding/turf-cricket-academy-logo.png', alt: 'Academy logo' },
    },
  },
];
