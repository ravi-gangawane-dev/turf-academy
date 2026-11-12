import { DataRequestError } from '../supabase/data-error';
import { inject, Injectable } from '@angular/core';
import { SupabaseClientService } from '../supabase/supabase-client.service';
import { AccountStatus, StaffRole } from './auth.model';

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'failed' | 'revoked';

export interface UserInvitation {
  readonly id: string;
  readonly email: string;
  readonly role: StaffRole;
  readonly status: InvitationStatus;
  readonly invited_at: string;
  readonly expires_at: string;
}

export interface ManagedUser {
  readonly id: string;
  readonly full_name: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly role: StaffRole;
  readonly status: AccountStatus;
  readonly created_at: string;
  readonly onboarding_completed_at?: string | null;
  readonly last_sign_in_at?: string | null;
  readonly pending_activation?: boolean;
  readonly invitation?: UserInvitation | null;
}
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

export interface UserAccessAuditRow {
  readonly id: number;
  readonly action: string;
  readonly table_name: string;
  readonly record_id: string | null;
  readonly occurred_at: string;
  readonly actor_id: string | null;
  readonly actor_name: string;
  readonly target_name: string;
  readonly old_values: Record<string, unknown> | null;
  readonly new_values: Record<string, unknown> | null;
}
export interface UserAccessAuditPage {
  readonly rows: readonly UserAccessAuditRow[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface UserInvitationLink {
  readonly invitationId: string;
  readonly userId: string;
  readonly actionLink: string;
  readonly expiresAt: string;
}

/** Only HTTPS links (or localhost during development) may be shown to an admin. */
function isSafeInvitationLink(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:') return true;
    return url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
  } catch {
    return false;
  }
}

const ERROR_MESSAGES: Record<string, string> = {
  invite_smtp_required: 'Email invitations require custom SMTP. Configure Supabase Authentication email settings; the default mail service only sends to project team members.',
  invite_email_invalid: 'This email address is not accepted by the email provider. Check the address and use a real mailbox.',
  invite_not_configured: 'Invitation email links are not configured. Contact the academy administrator.',
  invalid_invitation: 'Check the name, email and phone number.',
  account_exists: 'An account already exists for this email. Manage it in Users or use Forgot password.',
  invitation_pending: 'An invitation is already pending for this email. Use Resend invitation if it did not arrive.',
  invitation_not_found: 'No invitation exists for this email. Send a new invitation instead.',
  invitation_revoked: 'This invitation was revoked. Send a new invitation instead.',
  already_accepted: 'This account is already activated. Use Forgot password if the user needs a new password.',
  invite_rate_limited: 'Too many invitation emails. Please wait before trying again.',
  invite_delivery_failed: 'The invitation could not be sent. Check the academy email delivery configuration before retrying.',
  invite_link_failed: 'The invitation link could not be created. Try again or use Forgot password.',
  invite_profile_failed: 'The invitation was sent, but account access could not be confirmed. Review this user in Users before sending another invitation.',
  last_admin: 'At least one active administrator must remain.',
  reason_required: 'Add a short reason (at least 3 characters) for this access change.',
  access_partial: 'The profile was updated but the sign-in restriction could not be applied. Retry this change.',
};

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
  async invite(input:{fullName:string;email:string;phone?:string;role:StaffRole}):Promise<void>{await this.invoke({action:'invite',...input,fullName:input.fullName.trim(),email:input.email.trim().toLowerCase(),phone:input.phone?.trim()});}
  /**
   * Creates a single-use activation link without sending email, so an admin can
   * share it through another channel when the project SMTP cannot deliver.
   */
  async inviteLink(input:{fullName:string;email:string;phone?:string;role:StaffRole}):Promise<UserInvitationLink>{
    const response = await this.invoke<Partial<UserInvitationLink> & { error?: string }>({
      action:'link',
      ...input,
      fullName:input.fullName.trim(),
      email:input.email.trim().toLowerCase(),
      phone:input.phone?.trim(),
    });
    if (
      !isSafeInvitationLink(response.actionLink) ||
      typeof response.invitationId !== 'string' ||
      typeof response.userId !== 'string' ||
      typeof response.expiresAt !== 'string'
    ) {
      throw new Error(
        response.error ||
          'The invitation-link endpoint returned an invalid response. Deploy the latest admin-manage-users function.',
      );
    }
    return {
      invitationId: response.invitationId,
      userId: response.userId,
      actionLink: response.actionLink,
      expiresAt: response.expiresAt,
    };
  }
  async resend(email:string):Promise<void>{await this.invoke({action:'resend',email:email.trim().toLowerCase()});}
  async revoke(invitationId:string):Promise<void>{await this.invoke({action:'revoke',invitationId});}
  async update(userId:string,role:StaffRole,status:AccountStatus,reason:string):Promise<void>{await this.invoke({action:'update',userId,role,status,reason:reason.trim()});}
  async audit(page:number,pageSize:number):Promise<UserAccessAuditPage>{
    const response = await this.invoke<Partial<UserAccessAuditPage> & { error?: string }>({
      action: 'audit',
      page: Math.max(1, Math.floor(page)),
      pageSize: [5, 10, 20, 50, 100].includes(pageSize) ? pageSize : 5,
    });
    if (
      !Array.isArray(response.rows) ||
      typeof response.total !== 'number' ||
      typeof response.page !== 'number' ||
      typeof response.pageSize !== 'number'
    ) {
      throw new DataRequestError(
        'Load user access history',
        new Error(response.error || 'The access-history endpoint returned an invalid response. Deploy the latest admin-manage-users function.'),
      );
    }
    return {
      rows: response.rows,
      total: response.total,
      page: response.page,
      pageSize: response.pageSize,
    };
  }
  private async invoke<T=unknown>(body:Record<string,unknown>):Promise<T> {
    const {data,error} = await this.supabase.requireClient().functions.invoke('admin-manage-users',{body});
    if (error || data?.error) {
      let response = data;
      if (error?.context instanceof Response) {
        response = await error.context.clone().json().catch(() => null);
      }
      if (response?.code && ERROR_MESSAGES[response.code]) throw new Error(ERROR_MESSAGES[response.code]);
      if (error?.context instanceof Response && error.context.status === 401) throw new Error('Your session has expired. Sign in again before inviting a user.');
      if (error?.context instanceof Response && error.context.status === 403) throw new Error('Only an active administrator can manage accounts.');
      throw new DataRequestError('Manage account',error ?? data?.error);
    }
    return data as T;
  }
}
