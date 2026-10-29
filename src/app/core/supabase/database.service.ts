import { inject, Injectable } from '@angular/core';
import { PostgrestError } from '@supabase/supabase-js';
import { SupabaseClientService } from './supabase-client.service';
import { dataErrorMessage } from './data-error';

export class SupabaseDataError extends Error {
  constructor(readonly operation: string, readonly databaseError: PostgrestError) {
    super(dataErrorMessage(databaseError));
    this.name = 'SupabaseDataError';
  }
}

@Injectable({ providedIn: 'root' })
export class DatabaseService {
  private readonly supabase = inject(SupabaseClientService);

  get client() { return this.supabase.requireClient(); }

  unwrap<T>(operation: string, result: { data: T | null; error: PostgrestError | null }): T {
    if (result.error) throw new SupabaseDataError(operation, result.error);
    if (result.data === null) throw new Error(`${operation} returned no data.`);
    return result.data;
  }
}
