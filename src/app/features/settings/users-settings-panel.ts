import { ROLE_PERMISSIONS } from '../../core/auth/permissions';
import { TableTools } from '../../shared/data-table/table-tools';
import { AsyncState } from '../../shared/async-state/async-state';
import { ModalFocus } from '../../shared/interaction-dialog/modal-focus';
import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { UserManagementService, ManagedUser, ManagedUserFilters, ManagedUserQuery } from '../../core/auth/user-management.service';
import { AccountStatus, StaffRole } from '../../core/auth/auth.model';
import { Pagination } from '../../shared/pagination/pagination';
import { DEFAULT_PAGE_SIZE } from '../../shared/pagination/pagination.config';
import { SortableHeader } from '../../shared/sortable-header/sortable-header';

@Component({
  selector: 'app-users-settings-panel',
  imports: [TableTools, AsyncState, ModalFocus, ReactiveFormsModule, FormsModule, Pagination, SortableHeader],
  templateUrl: './users-settings-panel.html',
  styleUrl: './users-settings-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsersSettingsPanel implements OnInit, OnDestroy {
  protected readonly permissionRoles = ['admin', 'receptionist', 'coach', 'parent'] as const;
  protected readonly rolePermissions = ROLE_PERMISSIONS;
  private readonly usersApi = inject(UserManagementService); private readonly fb = inject(FormBuilder);
  private requestSequence = 0;
  private filterTimer?: ReturnType<typeof setTimeout>;
  protected readonly users = signal<readonly ManagedUser[]>([]); protected readonly total = signal(0); protected readonly page = signal(1); protected readonly pageSize = signal(DEFAULT_PAGE_SIZE); protected readonly filters: ManagedUserFilters = { name: '', contact: '', role: '', status: '', joined: '' }; protected sortBy: ManagedUserQuery['sortBy'] = 'createdAt'; protected sortDirection: ManagedUserQuery['sortDirection'] = 'desc'; protected readonly loading = signal(true); protected readonly saving = signal(false); protected readonly message = signal(''); protected readonly error = signal(''); protected readonly inviteOpen = signal(false);
  protected readonly form = this.fb.nonNullable.group({ fullName: ['', [Validators.required, Validators.minLength(2)]], email: ['', [Validators.required, Validators.email]], phone: [''], role: ['receptionist' as StaffRole, Validators.required] });
  async ngOnInit() { await this.reload(); }
  ngOnDestroy(): void { if (this.filterTimer) clearTimeout(this.filterTimer); }
  protected async invite() { if (this.form.invalid) { this.form.markAllAsTouched(); return; } this.saving.set(true); this.error.set(''); try { await this.usersApi.invite(this.form.getRawValue()); this.message.set('Invitation sent. The user can set a password from the email link.'); this.inviteOpen.set(false); this.form.reset({ fullName: '', email: '', phone: '', role: 'receptionist' }); await this.reload(); } catch (error) { this.error.set(error instanceof Error ? error.message : 'Invitation failed.'); } finally { this.saving.set(false); } }
  protected async changeAccess(user: ManagedUser, role: string, status: string) { this.saving.set(true); this.error.set(''); try { await this.usersApi.update(user.id, role as StaffRole, status as AccountStatus); this.message.set('User access updated.'); await this.reload(); } catch (error) { this.error.set(error instanceof Error ? error.message : 'Update failed.'); } finally { this.saving.set(false); } }
  protected scheduleFilters(): void { if (this.filterTimer) clearTimeout(this.filterTimer); this.page.set(1); this.filterTimer = setTimeout(() => { void this.reload(); }, 250); }
  protected async setPage(page: number) { if (this.filterTimer) clearTimeout(this.filterTimer); this.page.set(page); await this.reload(); }
  protected async setPageSize(size: number) { if (this.filterTimer) clearTimeout(this.filterTimer); this.pageSize.set(size); this.page.set(1); await this.reload(); }
  protected async sortColumn(key: ManagedUserQuery['sortBy']) { if (this.filterTimer) clearTimeout(this.filterTimer); if (this.sortBy === key) this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc'; else { this.sortBy = key; this.sortDirection = 'asc'; } this.page.set(1); await this.reload(); }
  private async reload() { const request = ++this.requestSequence; this.loading.set(true); this.error.set(''); try { const result = await this.usersApi.list({ page: this.page(), pageSize: this.pageSize(), search: '', role: '', status: '', filters: { name: this.filters.name.trim(), contact: this.filters.contact.trim(), role: this.filters.role.trim(), status: this.filters.status.trim(), joined: this.filters.joined }, sortBy: this.sortBy, sortDirection: this.sortDirection }); if (request !== this.requestSequence) return; this.users.set(result.users); this.total.set(result.total); this.page.set(result.page); } catch (error) { if (request === this.requestSequence) this.error.set(error instanceof Error ? error.message : 'Users could not be loaded.'); } finally { if (request === this.requestSequence) this.loading.set(false); } }
}
