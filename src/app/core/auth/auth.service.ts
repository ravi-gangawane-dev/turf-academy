import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Session } from '@supabase/supabase-js';
import { delay, finalize, from, map, Observable, of, shareReplay, tap } from 'rxjs';
import { ApiResponse, API_CONFIG } from '../config/api.config';
import { SupabaseClientService } from '../supabase/supabase-client.service';
import { AuthSession, LoginCredentials, StaffRole, UserProfile } from './auth.model';
import { Permission, ROLE_PERMISSIONS } from './permissions';

const SESSION_KEY = 'turf-academy-session';
const VALID_ROLES: readonly StaffRole[] = ['admin', 'coach', 'receptionist', 'parent'];

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);
  private readonly supabase = inject(SupabaseClientService);
  private readonly usesSupabase = this.config.backend === 'supabase';
  private readonly sessionState = signal<AuthSession | null>(!this.usesSupabase && this.config.useMockApi ? this.readMockSession() : null);
  readonly session = this.sessionState.asReadonly();
  readonly profile = computed(() => this.sessionState()?.profile ?? null);
  readonly role = computed(() => this.sessionState()?.user.role ?? null);
  readonly initialized = signal(!this.usesSupabase);
  readonly isAuthenticated = computed(() => this.initialized() && Boolean(this.sessionState()?.accessToken));
  private refreshRequest?: Observable<AuthSession>;
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
    await this.writeAudit('password_changed').catch(() => undefined);
  }

  accessToken(): string | null { return this.sessionState()?.accessToken ?? null; }
  hasRole(roles: readonly StaffRole[]): boolean { const role=this.role(); return Boolean(role && roles.includes(role)); }
  hasPermission(permission?: Permission): boolean { const role=this.role(); return !permission || Boolean(role && ROLE_PERMISSIONS[role].includes(permission)); }
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
  }

  private async loginWithSupabase(credentials: LoginCredentials): Promise<AuthSession> {
    const client=this.supabase.requireClient();
    const {data,error}=await client.auth.signInWithPassword({email:credentials.identity.trim(),password:credentials.password});
    if(error||!data.session)throw new Error(this.friendlyError(error));
    try { const session=await this.restoreSession(data.session); await this.writeAudit('login_success',data.user.id,data.user.email).catch(()=>undefined); return session; }
    catch(error){await client.auth.signOut();this.clearSession();throw error;}
  }

  private async restoreSession(session: Session): Promise<AuthSession> {
    const {data,error}=await this.supabase.requireClient().from('profiles').select('id,full_name,email,phone,avatar_url,role,status,is_active').eq('id',session.user.id).maybeSingle();
    if(error||!data)throw new Error('Account profile not configured.');
    if(!VALID_ROLES.includes(data.role as StaffRole))throw new Error('Account profile not configured.');
    if(!data.is_active||data.status==='inactive')throw new Error('Account inactive.');
    if(data.status==='suspended')throw new Error('Account suspended.');
    const profile:UserProfile={id:data.id,fullName:data.full_name,email:data.email??undefined,phone:data.phone??undefined,avatarUrl:data.avatar_url??undefined,role:data.role as StaffRole,status:data.status};
    const value:AuthSession={accessToken:session.access_token,user:{id:profile.id,name:profile.fullName,role:profile.role},profile};this.sessionState.set(value);return value;
  }
  private async refreshSupabase():Promise<AuthSession>{const {data,error}=await this.supabase.requireClient().auth.refreshSession();if(error||!data.session){this.clearSession();throw error??new Error('Session expired.');}return this.restoreSession(data.session);}
  private async writeAudit(action:string,userId?:string,email?:string):Promise<void>{await this.supabase.requireClient().from('auth_audit_logs').insert({user_id:userId??this.sessionState()?.user.id,email:email??this.profile()?.email,action,metadata:{user_agent:navigator.userAgent}});}
  private updateToken(token:string):void{const value=this.sessionState();if(value)this.sessionState.set({...value,accessToken:token});}
  private clearSession():void{this.sessionState.set(null);sessionStorage.removeItem(SESSION_KEY);}
  private saveMockSession(session:AuthSession):void{this.sessionState.set(session);sessionStorage.setItem(SESSION_KEY,JSON.stringify(session));}
  private readMockSession():AuthSession|null{try{const value=sessionStorage.getItem(SESSION_KEY);return value?JSON.parse(value) as AuthSession:null;}catch{sessionStorage.removeItem(SESSION_KEY);return null;}}
}
