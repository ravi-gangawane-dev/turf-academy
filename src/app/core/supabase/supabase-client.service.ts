import { inject, Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { API_CONFIG } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class SupabaseClientService {
  private readonly config = inject(API_CONFIG);
  readonly configured = Boolean(this.config.supabaseUrl && this.config.supabaseAnonKey);
  readonly client: SupabaseClient | null = this.configured
    ? createClient(this.config.supabaseUrl!, this.config.supabaseAnonKey!, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null;

  requireClient(): SupabaseClient {
    if (!this.client) {
      throw new Error(
        'Supabase is not configured. Set supabaseUrl and supabaseAnonKey in the deployment environment.',
      );
    }
    return this.client;
  }

}
