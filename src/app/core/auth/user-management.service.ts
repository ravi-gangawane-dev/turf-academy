import { DataRequestError } from '../supabase/data-error';
import { inject, Injectable } from '@angular/core';
import { SupabaseClientService } from '../supabase/supabase-client.service';
import { AccountStatus, StaffRole } from './auth.model';

export interface ManagedUser { readonly id:string; readonly full_name:string; readonly email:string|null; readonly phone:string|null; readonly role:StaffRole; readonly status:AccountStatus; readonly created_at:string; }
export interface ManagedUserPage {
  readonly users: readonly ManagedUser[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}
export interface ManagedUserFilters {
  name: string;
  contact: string;
  role: string;
  status: string;
  joined: string;
}
export interface ManagedUserQuery {
  readonly page: number;
  readonly pageSize: number;
  readonly search: string;
  readonly role: string;
  readonly status: string;
  readonly filters: ManagedUserFilters;
  readonly sortBy: 'name' | 'email' | 'role' | 'status' | 'createdAt';
  readonly sortDirection: 'asc' | 'desc';
}

@Injectable({providedIn:'root'})
export class UserManagementService {
  private readonly supabase=inject(SupabaseClientService);
  async list(query: ManagedUserQuery):Promise<ManagedUserPage>{
    const response = await this.invoke<Partial<ManagedUserPage> & { error?: string }>({
      action: 'list',
      ...query,
      page: Math.max(1, Math.floor(query.page)),
      pageSize: [5, 10, 20, 50, 100].includes(query.pageSize) ? query.pageSize : 5,
      search: query.search.trim(),
      role: query.role,
      status: query.status,
      filters: {
        name: query.filters.name.trim(),
        contact: query.filters.contact.trim(),
        role: query.filters.role.trim(),
        status: query.filters.status.trim(),
        joined: query.filters.joined,
      },
      sortBy: query.sortBy,
      sortDirection: query.sortDirection,
    });
    if (
      !Array.isArray(response.users) ||
      typeof response.total !== 'number' ||
      typeof response.page !== 'number' ||
      typeof response.pageSize !== 'number'
    ) {
      throw new DataRequestError(
        'Load users',
        new Error(response.error || 'The account-list endpoint returned an invalid response. Deploy the latest admin-manage-users function.'),
      );
    }
    return {
      users: response.users,
      total: response.total,
      page: response.page,
      pageSize: response.pageSize,
    };
  }
  async invite(input:{fullName:string;email:string;phone?:string;role:StaffRole}):Promise<void>{await this.invoke({action:'invite',...input,redirectTo:`${location.origin}/auth/reset-password`});}
  async update(userId:string,role:StaffRole,status:AccountStatus):Promise<void>{await this.invoke({action:'update',userId,role,status});}
  private async invoke<T=unknown>(body:Record<string,unknown>):Promise<T>{const {data,error}=await this.supabase.requireClient().functions.invoke('admin-manage-users',{body});if(error)throw new DataRequestError('Manage account',error);if(data?.error)throw new DataRequestError('Manage account',data.error);return data as T;}
}
