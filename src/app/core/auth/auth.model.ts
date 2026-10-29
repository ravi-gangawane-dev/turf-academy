export type StaffRole = 'admin' | 'coach' | 'receptionist' | 'parent';
export type AccountStatus = 'active' | 'inactive' | 'suspended';

export interface UserProfile {
  readonly id: string;
  readonly fullName: string;
  readonly email?: string;
  readonly phone?: string;
  readonly avatarUrl?: string;
  readonly role: StaffRole;
  readonly status: AccountStatus;
}

export interface AuthSession {
  readonly accessToken: string;
  readonly user: { readonly id: string; readonly name: string; readonly role: StaffRole };
  readonly profile?: UserProfile;
}

export interface AuthState {
  readonly initialized: boolean;
  readonly authenticated: boolean;
  readonly session: AuthSession | null;
  readonly profile: UserProfile | null;
}

export interface LoginCredentials {
  readonly identity: string;
  readonly password: string;
}
