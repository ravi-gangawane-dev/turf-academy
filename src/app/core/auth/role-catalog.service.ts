import { computed, inject, Injectable, signal } from '@angular/core';
import { API_CONFIG } from '../config/api.config';
import { SupabaseClientService } from '../supabase/supabase-client.service';
import { StaffRole } from './auth.model';
import {
  FALLBACK_ROLE_CATALOG,
  Permission,
  PermissionDefinition,
  RoleCatalog,
  RoleDefinition,
  ROLE_ORDER,
} from './permissions';

export type RoleCatalogSource = 'fallback' | 'backend';

const VALID_ROLES: readonly StaffRole[] = ROLE_ORDER;

interface RoleRow {
  readonly key: string;
  readonly label: string;
  readonly description: string | null;
  readonly rank: number | null;
  readonly is_staff: boolean | null;
}

interface PermissionRow {
  readonly key: string;
  readonly label: string;
  readonly description: string | null;
  readonly area: string | null;
}

interface RolePermissionRow {
  readonly role_key: string;
  readonly permission_key: string;
}

/**
 * Reads the authoritative role and permission catalogue from the academy
 * database. The compile-time matrix is only a fallback for mock mode, an
 * offline session or a database that has not received the catalogue migration,
 * so a failed catalogue read never blocks sign-in or the settings screens.
 */
@Injectable({ providedIn: 'root' })
export class RoleCatalogService {
  private readonly config = inject(API_CONFIG);
  private readonly supabase = inject(SupabaseClientService);
  private readonly usesSupabase = this.config.backend === 'supabase';
  private readonly state = signal<RoleCatalog>(FALLBACK_ROLE_CATALOG);
  private readonly loadedState = signal(false);
  private readonly sourceState = signal<RoleCatalogSource>('fallback');
  private readonly loadingState = signal(false);
  private readonly errorState = signal('');
  private request?: Promise<RoleCatalog>;

  readonly catalog = this.state.asReadonly();
  readonly loaded = this.loadedState.asReadonly();
  readonly source = this.sourceState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly roles = computed(() => this.state().roles);
  readonly permissions = computed(() => this.state().permissions);
  readonly matrix = computed(() => this.state().matrix);
  readonly roleOptions = computed(() =>
    this.state().roles.map((role) => ({ value: role.key, label: role.label })),
  );

  load(force = false): Promise<RoleCatalog> {
    if (this.request && !force) return this.request;
    if (this.loadedState() && !force) return Promise.resolve(this.state());
    this.request = this.fetch().finally(() => {
      this.request = undefined;
    });
    return this.request;
  }

  permissionsFor(role: StaffRole | null | undefined): readonly Permission[] {
    if (!role) return [];
    return this.state().matrix[role] ?? [];
  }

  roleLabel(role: StaffRole): string {
    return this.state().roles.find((entry) => entry.key === role)?.label ?? role;
  }

  permissionLabel(permission: Permission): string {
    return this.state().permissions.find((entry) => entry.key === permission)?.label ?? permission;
  }

  private async fetch(): Promise<RoleCatalog> {
    if (!this.usesSupabase) {
      this.loadedState.set(true);
      this.sourceState.set('fallback');
      return this.state();
    }
    this.loadingState.set(true);
    this.errorState.set('');
    try {
      const client = this.supabase.requireClient();
      const [roleResult, permissionResult, mapResult] = await Promise.all([
        client.from('roles').select('key,label,description,rank,is_staff').order('rank'),
        client.from('permissions').select('key,label,description,area').order('key'),
        client.from('role_permissions').select('role_key,permission_key'),
      ]);
      const error = roleResult.error ?? permissionResult.error ?? mapResult.error;
      if (error) throw error;
      const catalog = this.build(
        (roleResult.data ?? []) as RoleRow[],
        (permissionResult.data ?? []) as PermissionRow[],
        (mapResult.data ?? []) as RolePermissionRow[],
      );
      this.state.set(catalog);
      this.sourceState.set('backend');
      this.loadedState.set(true);
      return catalog;
    } catch (error) {
      this.state.set(FALLBACK_ROLE_CATALOG);
      this.sourceState.set('fallback');
      this.loadedState.set(true);
      this.errorState.set(
        error instanceof Error
          ? error.message
          : error && typeof error === 'object' && 'message' in error
            ? String((error as { message: unknown }).message)
            : 'The role catalogue could not be loaded from the database.',
      );
      return this.state();
    } finally {
      this.loadingState.set(false);
    }
  }

  private build(
    roleRows: readonly RoleRow[],
    permissionRows: readonly PermissionRow[],
    mapRows: readonly RolePermissionRow[],
  ): RoleCatalog {
    const roles: RoleDefinition[] = roleRows
      .filter((row): row is RoleRow & { key: StaffRole } =>
        VALID_ROLES.includes(row.key as StaffRole) && Boolean(row.label?.trim()),
      )
      .map((row) => ({
        key: row.key as StaffRole,
        label: row.label.trim(),
        description: row.description?.trim() ?? '',
        rank: row.rank ?? 0,
        isStaff: row.is_staff ?? row.key !== 'parent',
      }))
      .sort((a, b) => a.rank - b.rank || ROLE_ORDER.indexOf(a.key) - ROLE_ORDER.indexOf(b.key));

    const permissions: PermissionDefinition[] = permissionRows
      .filter((row) => Boolean(row.key?.trim()) && Boolean(row.label?.trim()))
      .map((row) => ({
        key: row.key as Permission,
        label: row.label.trim(),
        description: row.description?.trim() ?? '',
        area: row.area?.trim() || 'General',
      }))
      .sort((a, b) => a.key.localeCompare(b.key));

    // A partial catalogue would silently change who can open which screen. Only
    // accept the database catalogue when all four roles and every permission
    // mapping are present; otherwise keep the reviewed built-in matrix.
    if (roles.length !== VALID_ROLES.length || !permissions.length || !mapRows.length) {
      throw new Error('The role catalogue in the database is incomplete.');
    }

    const knownPermissions = new Set(permissions.map((permission) => permission.key));
    const matrix = Object.fromEntries(
      roles.map((role) => [role.key, [] as Permission[]]),
    ) as Record<StaffRole, Permission[]>;
    for (const row of mapRows) {
      if (!(row.role_key in matrix) || !knownPermissions.has(row.permission_key as Permission)) continue;
      const list = matrix[row.role_key as StaffRole];
      if (!list.includes(row.permission_key as Permission)) list.push(row.permission_key as Permission);
    }
    for (const role of roles) {
      matrix[role.key].sort((a, b) => a.localeCompare(b));
      if (!matrix[role.key].length) {
        throw new Error('The role catalogue in the database is incomplete.');
      }
    }

    return { roles, permissions, matrix };
  }
}
