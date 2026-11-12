import { DatePipe } from '@angular/common';
import { RoleCatalogService } from '../../core/auth/role-catalog.service';
import { TableTools } from '../../shared/data-table/table-tools';
import { AsyncState } from '../../shared/async-state/async-state';
import { ModalFocus } from '../../shared/interaction-dialog/modal-focus';
import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import {
  UserManagementService,
  ManagedUser,
  ManagedUserFilters,
  ManagedUserQuery,
  UserAccessAuditRow,
  UserInvitationLink,
} from '../../core/auth/user-management.service';
import { AccountStatus, StaffRole } from '../../core/auth/auth.model';
import { ToastService } from '../../shared/toast/toast.service';
import { Pagination } from '../../shared/pagination/pagination';
import { DEFAULT_PAGE_SIZE } from '../../shared/pagination/pagination.config';
import { SortableHeader } from '../../shared/sortable-header/sortable-header';

interface PendingAccessChange {
  readonly user: ManagedUser;
  readonly role: StaffRole;
  readonly status: AccountStatus;
  readonly roleSelect?: HTMLSelectElement;
  readonly statusSelect?: HTMLSelectElement;
}

@Component({
  selector: 'app-users-settings-panel',
  imports: [TableTools, AsyncState, ModalFocus, ReactiveFormsModule, FormsModule, Pagination, SortableHeader, DatePipe],
  templateUrl: './users-settings-panel.html',
  styleUrl: './users-settings-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsersSettingsPanel implements OnInit, OnDestroy {
  protected readonly roleCatalog = inject(RoleCatalogService);
  protected readonly roleOptions = this.roleCatalog.roleOptions;
  protected readonly permissionSummary = computed(() => {
    const labels = new Map(this.roleCatalog.permissions().map((permission) => [permission.key, permission]));
    return this.roleCatalog.roles().map((role) => ({
      ...role,
      permissionLabels: this.roleCatalog.matrix()[role.key].map(
        (key) => labels.get(key)?.label ?? key,
      ),
    }));
  });
  private readonly usersApi = inject(UserManagementService); private readonly fb = inject(FormBuilder); private readonly toast = inject(ToastService);
  private requestSequence = 0;
  private auditRequest = 0;
  private filterTimer?: ReturnType<typeof setTimeout>;
  protected readonly users = signal<readonly ManagedUser[]>([]); protected readonly total = signal(0); protected readonly page = signal(1); protected readonly pageSize = signal(DEFAULT_PAGE_SIZE); protected readonly filters: ManagedUserFilters = { name: '', contact: '', role: '', status: '', joined: '' }; protected sortBy: ManagedUserQuery['sortBy'] = 'createdAt'; protected sortDirection: ManagedUserQuery['sortDirection'] = 'desc'; protected readonly loading = signal(true); protected readonly saving = signal(false); protected readonly error = signal(''); protected readonly inviteOpen = signal(false);
  protected readonly form = this.fb.nonNullable.group({ fullName: ['', [Validators.required, Validators.minLength(2)]], email: ['', [Validators.required, Validators.email]], phone: [''], role: ['receptionist' as StaffRole, Validators.required] });
  protected readonly pendingAccess = signal<PendingAccessChange | null>(null);
  protected readonly accessError = signal('');
  protected readonly accessForm = this.fb.nonNullable.group({
    reason: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(500)]],
  });
  protected readonly auditRows = signal<readonly UserAccessAuditRow[]>([]);
  protected readonly auditTotal = signal(0);
  protected readonly auditPage = signal(1);
  protected readonly auditPageSize = signal(DEFAULT_PAGE_SIZE);
  protected readonly auditLoading = signal(false);
  protected readonly auditError = signal('');
  protected readonly linkDialog = signal<UserInvitationLink | null>(null);
  protected readonly linkEmail = signal('');
  protected readonly linkBusy = signal(false);
  protected readonly linkError = signal('');
  protected readonly linkCopied = signal(false);
  async ngOnInit() { void this.roleCatalog.load(); await Promise.all([this.reload(), this.loadAudit()]); }
  protected async reloadCatalog(): Promise<void> { await this.roleCatalog.load(true); }
  ngOnDestroy(): void { if (this.filterTimer) clearTimeout(this.filterTimer); }
  protected dismissInviteBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget && !this.saving()) this.inviteOpen.set(false);
  }
  protected async invite() {
    if (this.saving()) return;
    this.normalizeInviteForm();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set('');
    try {
      await this.usersApi.invite(this.form.getRawValue());
      this.toast.success('Invitation sent. The user can set a password from the email link.');
      this.inviteOpen.set(false);
      this.form.reset({ fullName: '', email: '', phone: '', role: 'receptionist' });
      await this.reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invitation failed.';
      // Keep the failure next to the form: the admin can retry or copy a link.
      this.error.set(message);
      this.toast.error(message);
    } finally {
      this.saving.set(false);
    }
  }
  /** Fallback when email delivery is unavailable: create a link the admin can share. */
  protected async createInviteLink(): Promise<void> {
    if (this.saving()) return;
    this.normalizeInviteForm();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.linkError.set('');
    try {
      const link = await this.usersApi.inviteLink(this.form.getRawValue());
      const email = this.form.controls.email.value;
      this.inviteOpen.set(false);
      this.form.reset({ fullName: '', email: '', phone: '', role: 'receptionist' });
      this.openInviteLink(link, email);
      await this.reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invitation link could not be created.';
      this.error.set(message);
      this.toast.error(message);
    } finally {
      this.saving.set(false);
    }
  }
  /** Recreates a link for a pending or failed invitation straight from the row. */
  protected async showInviteLink(user: ManagedUser): Promise<void> {
    if (!user.email || this.linkBusy() || this.saving()) return;
    this.linkBusy.set(true);
    this.linkError.set('');
    try {
      this.openInviteLink(
        await this.usersApi.inviteLink({
          fullName: user.full_name,
          email: user.email,
          phone: user.phone ?? undefined,
          role: user.role,
        }),
        user.email,
      );
    } catch (error) {
      this.toast.error(error instanceof Error ? error.message : 'Invitation link could not be created.');
    } finally {
      this.linkBusy.set(false);
    }
  }
  protected async copyInviteLink(): Promise<void> {
    const link = this.linkDialog();
    if (!link) return;
    this.linkError.set('');
    try {
      await navigator.clipboard.writeText(link.actionLink);
      this.linkCopied.set(true);
      this.toast.success('Invitation link copied.');
    } catch {
      this.linkCopied.set(false);
      this.linkError.set('Copy failed. Select the link and copy it manually.');
    }
  }
  protected selectLink(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.select();
  }
  protected dismissLinkBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closeInviteLink();
  }
  protected closeInviteLink(): void {
    if (this.linkBusy()) return;
    this.linkDialog.set(null);
    this.linkCopied.set(false);
    this.linkError.set('');
  }
  private openInviteLink(link: UserInvitationLink, email: string): void {
    this.linkEmail.set(email);
    this.linkCopied.set(false);
    this.linkError.set('');
    this.linkDialog.set(link);
  }
  private normalizeInviteForm(): void {
    this.form.patchValue({
      fullName: this.form.controls.fullName.value.trim(),
      email: this.form.controls.email.value.trim().toLowerCase(),
      phone: this.form.controls.phone.value.trim(),
    });
  }
  protected dismissAccessBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget && !this.saving()) this.cancelAccessChange();
  }
  /**
   * Role/status changes are reviewed before they are written: the select change
   * only opens the confirmation dialog, and the actual update carries a reason.
   */
  protected requestAccessChange(
    user: ManagedUser,
    role: string,
    status: string,
    roleSelect: HTMLSelectElement,
    statusSelect: HTMLSelectElement,
  ): void {
    const nextRole = role as StaffRole;
    const nextStatus = status as AccountStatus;
    if (nextRole === user.role && nextStatus === user.status) return;
    if (this.saving() || this.pendingAccess()) {
      roleSelect.value = user.role;
      statusSelect.value = user.status;
      return;
    }
    this.accessError.set('');
    this.accessForm.reset({ reason: '' });
    this.pendingAccess.set({ user, role: nextRole, status: nextStatus, roleSelect, statusSelect });
  }
  protected cancelAccessChange(): void {
    if (this.saving()) return;
    const change = this.pendingAccess();
    if (change?.roleSelect) change.roleSelect.value = change.user.role;
    if (change?.statusSelect) change.statusSelect.value = change.user.status;
    this.pendingAccess.set(null);
    this.accessError.set('');
    this.accessForm.reset({ reason: '' });
  }
  protected async confirmAccessChange(): Promise<void> {
    const change = this.pendingAccess();
    if (!change || this.saving()) return;
    this.accessForm.controls.reason.markAsTouched();
    if (this.accessForm.invalid) return;
    const reason = this.accessForm.controls.reason.value.trim();
    if (reason.length < 3) return;
    this.saving.set(true);
    this.accessError.set('');
    this.error.set('');
    try {
      await this.usersApi.update(change.user.id, change.role, change.status, reason);
      this.toast.success('User access updated.');
      this.pendingAccess.set(null);
      this.accessForm.reset({ reason: '' });
      await Promise.all([this.reload(), this.loadAudit()]);
    } catch (error) {
      this.accessError.set(error instanceof Error ? error.message : 'Update failed.');
    } finally {
      this.saving.set(false);
    }
  }
  protected async loadAudit(): Promise<void> {
    const request = ++this.auditRequest;
    this.auditLoading.set(true);
    this.auditError.set('');
    try {
      const result = await this.usersApi.audit(this.auditPage(), this.auditPageSize());
      if (request !== this.auditRequest) return;
      this.auditRows.set(result.rows);
      this.auditTotal.set(result.total);
      this.auditPage.set(result.page);
    } catch (error) {
      if (request !== this.auditRequest) return;
      this.auditRows.set([]);
      this.auditTotal.set(0);
      this.auditError.set(error instanceof Error ? error.message : 'Access history could not be loaded.');
    } finally {
      if (request === this.auditRequest) this.auditLoading.set(false);
    }
  }
  protected async setAuditPage(page: number): Promise<void> {
    this.auditPage.set(page);
    await this.loadAudit();
  }
  protected async setAuditPageSize(size: number): Promise<void> {
    this.auditPageSize.set(size);
    this.auditPage.set(1);
    await this.loadAudit();
  }
  protected accessSummary(row: UserAccessAuditRow): string {
    const before = row.old_values ?? {};
    const after = row.new_values ?? {};
    const value = (input: unknown): string => (typeof input === 'string' && input ? input : '—');
    if (row.action === 'invitation_sent' || row.action === 'invitation_resent') {
      return `Invitation ${row.action === 'invitation_resent' ? 'resent' : 'sent'} as ${value(after['role'])}`;
    }
    if (row.action === 'invitation_link_generated') {
      return `Invitation link created as ${value(after['role'])}`;
    }
    if (row.action === 'invitation_revoked') return 'Invitation revoked';
    const parts: string[] = [];
    if (before['role'] !== after['role']) parts.push(`Role ${value(before['role'])} → ${value(after['role'])}`);
    if (before['status'] !== after['status']) parts.push(`Status ${value(before['status'])} → ${value(after['status'])}`);
    return parts.join(' · ') || 'Access updated';
  }
  protected accessReason(row: UserAccessAuditRow): string {
    const reason = row.new_values?.['reason'];
    return typeof reason === 'string' && reason.trim() ? reason : 'Direct change';
  }
  protected async resendInvitation(user: ManagedUser) { if (!user.email || this.saving()) return; this.saving.set(true); this.error.set(''); try { await this.usersApi.resend(user.email); this.toast.success(`Invitation resent to ${user.email}.`); await this.reload(); } catch (error) { this.toast.error(error instanceof Error ? error.message : 'The invitation could not be resent.'); } finally { this.saving.set(false); } }
  protected async revokeInvitation(user: ManagedUser) { const invitation = user.invitation; if (!invitation || this.saving()) return; this.saving.set(true); this.error.set(''); try { await this.usersApi.revoke(invitation.id); this.toast.success('Invitation revoked.'); await this.reload(); } catch (error) { this.toast.error(error instanceof Error ? error.message : 'The invitation could not be revoked.'); } finally { this.saving.set(false); } }
  protected canResend(user: ManagedUser): boolean { const status = user.invitation?.status; return Boolean(user.email) && (!status || status === 'pending' || status === 'failed' || status === 'expired'); }
  protected canRevoke(user: ManagedUser): boolean { const status = user.invitation?.status; return status === 'pending' || status === 'failed' || status === 'expired'; }
  protected accountLabel(user: ManagedUser): string { if (user.status !== 'active') return user.status === 'suspended' ? 'Suspended' : 'Disabled'; return user.pending_activation ? 'Pending activation' : 'Active'; }
  protected invitationLabel(user: ManagedUser): string { return user.invitation ? user.invitation.status : 'Not invited'; }
  protected invitedOn(user: ManagedUser): string { return user.invitation?.invited_at?.slice(0, 10) ?? '—'; }
  protected lastLogin(user: ManagedUser): string { return user.last_sign_in_at ? user.last_sign_in_at.slice(0, 10) : 'Never'; }
  protected scheduleFilters(): void { if (this.filterTimer) clearTimeout(this.filterTimer); this.page.set(1); this.filterTimer = setTimeout(() => { void this.reload(); }, 250); }
  protected async setPage(page: number) { if (this.filterTimer) clearTimeout(this.filterTimer); this.page.set(page); await this.reload(); }
  protected async setPageSize(size: number) { if (this.filterTimer) clearTimeout(this.filterTimer); this.pageSize.set(size); this.page.set(1); await this.reload(); }
  protected async sortColumn(key: ManagedUserQuery['sortBy']) { if (this.filterTimer) clearTimeout(this.filterTimer); if (this.sortBy === key) this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc'; else { this.sortBy = key; this.sortDirection = 'asc'; } this.page.set(1); await this.reload(); }
  private async reload() { const request = ++this.requestSequence; this.loading.set(true); this.error.set(''); try { const result = await this.usersApi.list({ page: this.page(), pageSize: this.pageSize(), search: '', role: '', status: '', filters: { name: this.filters.name.trim(), contact: this.filters.contact.trim(), role: this.filters.role.trim(), status: this.filters.status.trim(), joined: this.filters.joined }, sortBy: this.sortBy, sortDirection: this.sortDirection }); if (request !== this.requestSequence) return; this.users.set(result.users); this.total.set(result.total); this.page.set(result.page); } catch (error) { if (request === this.requestSequence) this.error.set(error instanceof Error ? error.message : 'Users could not be loaded.'); } finally { if (request === this.requestSequence) this.loading.set(false); } }
}
