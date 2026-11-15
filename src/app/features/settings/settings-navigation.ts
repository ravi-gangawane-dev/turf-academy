import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { StaffRole } from '../../core/auth/auth.model';
import { UserManagementService } from '../../core/auth/user-management.service';
import { InteractionDialogService } from '../../shared/interaction-dialog/interaction-dialog.service';
import { ModalBackdrop } from '../../shared/interaction-dialog/modal-backdrop';
import { ModalFocus } from '../../shared/interaction-dialog/modal-focus';
import { SettingsTabs } from '../../shared/settings-tabs/settings-tabs';

@Component({
  selector: 'app-settings-navigation',
  imports: [ReactiveFormsModule, FormsModule, ModalFocus, SettingsTabs, ModalBackdrop],
  templateUrl: './settings-navigation.html',
  styleUrl: './settings-navigation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsNavigation {
  protected readonly dialog = inject(InteractionDialogService);
  protected readonly activePanel = signal<'summary' | 'open simple dialog' | string>('summary');

  form = new FormGroup({
    fullName: new FormControl<string>('', { nonNullable: true }),
    email: new FormControl<string>('', [Validators.email]),
    phone: new FormControl<string>('', { nonNullable: true }),
    role: new FormControl<string>('receptionist', { nonNullable: true }),
  }, { validators: [atLeastOneFieldFilled] });

  private readonly usersApi = inject(UserManagementService);
  protected readonly inviteOpen = signal<boolean>(false);
  protected readonly saving = signal<boolean>(false);

  focusPanel(panelName: string): void {
    this.activePanel.set(panelName);
    // Open simple confirmation dialog using existing InteractionDialogService
    this.dialog.confirm(
      'Are you sure you want to open the ' + panelName + ' panel?',
      'Panel Confirmation'
    ).then((confirmed) => {
      if (confirmed) {
        // User confirmed - panel navigation proceeds
      }
    });
  }

  openSimpleDialog(): void {

    // Open a simple informational dialog using existing InteractionDialogService
    this.dialog.confirm(
      'This is a simple dialog box.  Are you sure you want to proceed?',
      'Simple Dialog'
    ).then((confirmed) => {
      if (confirmed) {
        // User confirmed
      }
    });
  }

  invite(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const value = this.form.getRawValue();
    // Call the admin function to invite a new user
    this.usersApi
      .invite({
        fullName: value.fullName,
        email: value.email || '',
        phone: value.phone || undefined,
        role: value.role as StaffRole,
      })
      .then(() => {
        this.saving.set(false);
        this.dialog
          .confirm('Invitation sent successfully.', 'Success')
          .then((confirmed) => {
            if (confirmed) {
              this.inviteOpen.set(false);
              this.form.reset({ fullName: '', email: '', phone: '', role: 'receptionist' });
            }
          });
      })
      .catch((err) => {
        this.saving.set(false);
        this.dialog.confirm('Failed to send invitation: ' + (err?.error?.message || err), 'Error');
      });
  }
}

function atLeastOneFieldFilled(control: AbstractControl): Record<string, boolean> | null {
  const group = control as FormGroup;
  const { fullName, email, phone, role } = group.controls;
  const filled = fullName.value || email.value || phone.value || role.value;
  return filled ? null : { atLeastOneFieldFilled: true };
}