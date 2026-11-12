import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Session } from '@supabase/supabase-js';
import { delay, finalize, from, map, Observable, of, shareReplay, tap } from 'rxjs';
import { ApiResponse, API_CONFIG } from '../config/api.config';
import { SupabaseClientService } from '../supabase/supabase-client.service';
import { AuthSession, LoginCredentials, StaffRole, UserProfile } from './auth.model';
import { Permission } from './permissions';
import { RoleCatalogService } from './role-catalog.service';

const SESSION_KEY = 'turf-academy-session';
const VALID_ROLES: readonly StaffRole[] = ['admin', 'coach', 'receptionist', 'parent'];
/** Re-check an open session at least this often, and immediately when the tab regains focus. */
export const SESSION_REVALIDATE_MS = 5 * 60 * 1000;
export type SessionEndReason = 'expired' | 'inactive' | 'suspended' | 'removed';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);
  private readonly supabase = inject(SupabaseClientService);
  private readonly roleCatalog = inject(RoleCatalogService);
  /** Optional so the service stays constructible in isolated unit tests. */
  private readonly router = inject(Router, { optional: true });
  private readonly usesSupabase = this.config.backend === 'supabase';
  private readonly sessionState = signal<AuthSession | null>(!this.usesSupabase && this.config.useMockApi ? this.readMockSession() : null);
  readonly session = this.sessionState.asReadonly();
  readonly profile = computed(() => this.sessionState()?.profile ?? null);
  readonly role = computed(() => this.sessionState()?.user.role ?? null);
  readonly initialized = signal(!this.usesSupabase);
  readonly isAuthenticated = computed(() => this.initialized() && Boolean(this.sessionState()?.accessToken));
  /** Why the last session was closed by server-side revalidation; the route shows a matching message. */
  readonly sessionEndReason = signal<SessionEndReason | null>(null);
  private refreshRequest?: Observable<AuthSession>;
  private validationRequest?: Promise<boolean>;
  private revalidationTimer?: ReturnType<typeof setInterval>;
  private readonly initialization = this.initializeSupabase();

  ensureInitialized(): Promise<void> { return this.initialization; }

  login(credentials: LoginCredentials): Observable<AuthSession> {
    if (this.usesSupabase) return from(this.loginWithSupabase(credentials));
    if (this.config.useMockApi) {
      const identity = credentials.identity.toLowerCase();
      const role: StaffRole = identity.includes('coach') ? 'coach' : identity.includes('reception') ? 'receptionist' : identity.includes('parent') ? 'parent' : 'admin';
      const name = role === 'admin' ? 'Ravi Admin' : `Demo ${role[0].toUpperCase()}${role.slice(1)}`;
      const profile: UserProfile = { id: 'user-1', fullName: name, email: identity, role, status: 'active' };
      const value: AuthSession = { accessToken: 'mock-access-token', user: { id: profile.id, name, role }, profile };
      return of(value).pipe(delay(350), tap((session) => this.saveMockSession(session)));
    }
    return this.http.post<ApiResponse<AuthSession>>(`${this.config.baseUrl}/auth/login`, credentials).pipe(map((response) => response.data), tap((session) => this.sessionState.set(session)));
  }

  async logout(): Promise<void> {
    const current = this.sessionState(); this.clearSession();
    if (this.usesSupabase && this.supabase.client) {
      if (current) await this.writeAudit('logout', current.user.id, current.profile?.email).catch(() => undefined);
      await this.supabase.client.auth.signOut();
    }
  }

  async resetPassword(email: string): Promise<void> {
    const { error } = await this.supabase.requireClient().auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/auth/reset-password` });
    if (error) throw new Error(this.friendlyError(error));
  }
  async verifyOtp(email: string, token: string): Promise<void> {
    const { error } = await this.supabase.requireClient().auth.verifyOtp({ email, token, type: 'recovery' });
    if (error) throw new Error(this.friendlyError(error));
  }
  async changePassword(password: string): Promise<void> {
    const { error } = await this.supabase.requireClient().auth.updateUser({ password });
    if (error) throw new Error(this.friendlyError(error));
    await this.completeOnboarding();
    await this.writeAudit('password_changed').catch(() => undefined);
  }

  /**
   * Confirms the trusted invitation relationship after the invited user sets a
   * password. The server derives the account and role from the authenticated
   * identity, so no URL parameter can choose which account is updated. Failure
   * is logged rather than blocking an already-changed password.
   */
  async completeOnboarding(): Promise<void> {
    if (!this.usesSupabase) return;
    const { error } = await this.supabase.requireClient().rpc('complete_account_onboarding');
    if (error) console.error('onboarding completion failed', { code: error.code });
  }

  /** Sign-in marker for the admin user list; never blocks authentication. */
  private recordSignIn(): void {
    if (!this.usesSupabase) return;
    void this.supabase.requireClient().rpc('record_sign_in').then(
      ({ error }) => { if (error) console.warn('sign-in timestamp not recorded', { code: error.code }); },
      () => undefined,
    );
  }

  accessToken(): string | null { return this.sessionState()?.accessToken ?? null; }
  hasRole(roles: readonly StaffRole[]): boolean { const role=this.role(); return Boolean(role && roles.includes(role)); }
  hasPermission(permission?: Permission): boolean { const role=this.role(); return !permission || Boolean(role && this.roleCatalog.matrix()[role].includes(permission)); }
  dashboardForRole(role=this.role()): string { return role==='admin'?'/redirect/admin':role==='coach'?'/redirect/coach':role==='receptionist'?'/redirect/reception':role==='parent'?'/redirect/parent':'/auth/login'; }

  refresh(): Observable<AuthSession> {
    if (this.usesSupabase) return from(this.refreshSupabase());
    if (!this.refreshRequest) this.refreshRequest=this.http.post<ApiResponse<AuthSession>>(`${this.config.baseUrl}/auth/refresh-token`,{}).pipe(map(r=>r.data),tap(s=>this.sessionState.set(s)),finalize(()=>this.refreshRequest=undefined),shareReplay({bufferSize:1,refCount:false}));
    return this.refreshRequest;
  }

  friendlyError(error: unknown): string {
    const message=(error && typeof error === 'object' && 'message' in error ? String(error.message) : String(error)).toLowerCase();
    if(/expired|invalid.*(?:token|code|link)|(?:token|code|link).*invalid|session missing/.test(message))return 'This recovery link or code is invalid or has expired. Request a new reset link.';
    if(message.includes('password') && /different|same/.test(message))return 'Choose a password different from your current password.';
    if(message.includes('invalid login')||message.includes('invalid credentials'))return 'Invalid email or password.';
    if(message.includes('rate')||message.includes('too many'))return 'Too many login attempts. Please wait and try again.';
    if(message.includes('inactive'))return 'Your account is inactive. Please contact the academy administrator.';
    if(message.includes('suspended'))return 'Your account has been suspended. Please contact the academy administrator.';
    if(message.includes('profile')||message.includes('configured'))return 'Your account has not been configured. Please contact the administrator.';
    if(message.includes('network')||message.includes('fetch'))return 'Unable to connect to the server. Please check your internet connection and try again.';
    return 'Authentication could not be completed. Please try again.';
  }

  private async initializeSupabase(): Promise<void> {
    if(!this.usesSupabase){this.initialized.set(true);return;}
    const client=this.supabase.requireClient();
    try { const {data,error}=await client.auth.getSession(); if(error)throw error; if(data.session)await this.restoreSession(data.session); }
    catch { this.clearSession(); } finally { this.initialized.set(true); }
    client.auth.onAuthStateChange((event,session)=>{
      if(event==='SIGNED_OUT'||!session)this.clearSession();
      else if(event==='TOKEN_REFRESHED')this.updateToken(session.access_token);
      else if(event==='SIGNED_IN'&&!this.sessionState())void this.restoreSession(session).catch(()=>this.logout());
    });
    this.startSessionRevalidation();
  }

  /**
   * Re-reads the signed-in profile so a disabled, suspended or removed account
   * loses the UI as soon as the database changes, not only after a reload. RLS
   * already rejects new data; this closes the gap where an open tab still looks
   * usable. Network failures are treated as transient and never sign a user out.
   */
  checkSession(): Promise<boolean> {
    if (!this.usesSupabase) return Promise.resolve(Boolean(this.sessionState()));
    if (this.validationRequest) return this.validationRequest;
    if (!this.sessionState()) return Promise.resolve(false);
    this.validationRequest = this.validateSession().finally(() => {
      this.validationRequest = undefined;
    });
    return this.validationRequest;
  }

  private async validateSession(): Promise<boolean> {
    try {
      const client = this.supabase.requireClient();
      const { data: { session }, error } = await client.auth.getSession();
      if (error || !session) {
        await this.endSession('expired');
        return false;
      }
      const { data, error: profileError } = await client
        .from('profiles')
        .select('id,full_name,email,phone,avatar_url,role,status,is_active')
        .eq('id', session.user.id)
        .maybeSingle();
      if (profileError || !data) {
        await this.endSession('removed');
        return false;
      }
      if (!VALID_ROLES.includes(data.role as StaffRole)) {
        await this.endSession('removed');
        return false;
      }
      if (!data.is_active || data.status === 'inactive') {
        await this.endSession('inactive');
        return false;
      }
      if (data.status === 'suspended') {
        await this.endSession('suspended');
        return false;
      }
      const profile = this.profileFromRow(data);
      this.sessionState.set({
        accessToken: session.access_token,
        user: { id: profile.id, name: profile.fullName, role: profile.role },
        profile,
      });
      return true;
    } catch {
      // A temporary network or PostgREST failure must not end a valid session.
      return Boolean(this.sessionState());
    }
  }

  private async endSession(reason: SessionEndReason): Promise<void> {
    this.clearSession();
    this.sessionEndReason.set(reason);
    try {
      await this.supabase.client?.auth.signOut({ scope: 'local' });
    } catch {
      /* The local session is already cleared; a failed revoke is non-blocking. */
    }
    if (this.router) {
      await this.router
        .navigateByUrl(`/auth/session-expired?reason=${reason}`, { replaceUrl: true })
        .catch(() => undefined);
    }
  }

  private startSessionRevalidation(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const checkWhenVisible = () => {
      if (document.visibilityState === 'visible') void this.checkSession();
    };
    document.addEventListener('visibilitychange', checkWhenVisible);
    window.addEventListener('focus', checkWhenVisible);
    this.revalidationTimer = setInterval(checkWhenVisible, SESSION_REVALIDATE_MS);
    // The timer is only cleared when the app is torn down; browsers do this on unload.
    window.addEventListener('pagehide', () => {
      if (this.revalidationTimer) clearInterval(this.revalidationTimer);
    }, { once: true });
  }

  private async loginWithSupabase(credentials: LoginCredentials): Promise<AuthSession> {
    const client=this.supabase.requireClient();
    const {data,error}=await client.auth.signInWithPassword({email:credentials.identity.trim(),password:credentials.password});
    if(error||!data.session)throw new Error(this.friendlyError(error));
    try { const session=await this.restoreSession(data.session); this.recordSignIn(); await this.writeAudit('login_success',data.user.id,data.user.email).catch(()=>undefined); return session; }
    catch(error){await client.auth.signOut();this.clearSession();throw error;}
  }

  private async restoreSession(session: Session): Promise<AuthSession> {
    const {data,error}=await this.supabase.requireClient().from('profiles').select('id,full_name,email,phone,avatar_url,role,status,is_active').eq('id',session.user.id).maybeSingle();
    if(error||!data)throw new Error('Account profile not configured.');
    if(!VALID_ROLES.includes(data.role as StaffRole))throw new Error('Account profile not configured.');
    if(!data.is_active||data.status==='inactive')throw new Error('Account inactive.');
    if(data.status==='suspended')throw new Error('Account suspended.');
    const profile=this.profileFromRow(data);
    const value:AuthSession={accessToken:session.access_token,user:{id:profile.id,name:profile.fullName,role:profile.role},profile};this.sessionState.set(value);
    // The catalogue updates hasPermission() with the database matrix; failure falls back locally.
    void this.roleCatalog.load();
    return value;
  }
  private profileFromRow(data: Record<string, unknown>): UserProfile {
    return {
      id: String(data['id']),
      fullName: String(data['full_name'] ?? ''),
      email: data['email'] ? String(data['email']) : undefined,
      phone: data['phone'] ? String(data['phone']) : undefined,
      avatarUrl: data['avatar_url'] ? String(data['avatar_url']) : undefined,
      role: data['role'] as StaffRole,
      status: data['status'] as UserProfile['status'],
    };
  }
  private async refreshSupabase():Promise<AuthSession>{const {data,error}=await this.supabase.requireClient().auth.refreshSession();if(error||!data.session){this.clearSession();throw error??new Error('Session expired.');}return this.restoreSession(data.session);}
  private async writeAudit(action:string,userId?:string,email?:string):Promise<void>{await this.supabase.requireClient().from('auth_audit_logs').insert({user_id:userId??this.sessionState()?.user.id,email:email??this.profile()?.email,action,metadata:{user_agent:navigator.userAgent}});}
  private updateToken(token:string):void{const value=this.sessionState();if(value)this.sessionState.set({...value,accessToken:token});}
  private clearSession():void{this.sessionState.set(null);sessionStorage.removeItem(SESSION_KEY);}
  private saveMockSession(session:AuthSession):void{this.sessionState.set(session);sessionStorage.setItem(SESSION_KEY,JSON.stringify(session));}
  private readMockSession():AuthSession|null{try{const value=sessionStorage.getItem(SESSION_KEY);return value?JSON.parse(value) as AuthSession:null;}catch{sessionStorage.removeItem(SESSION_KEY);return null;}}
}
