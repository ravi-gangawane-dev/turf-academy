import { inject, Injectable } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';
import { DataRequestError } from './data-error';

export type PrivateBucket = 'student-photos' | 'parent-photos' | 'student-documents' | 'coach-photos' | 'medical-documents' | 'receipts';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly supabase = inject(SupabaseClientService);

  async upload(bucket: PrivateBucket, ownerId: string, file: File): Promise<string> {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const path = `${ownerId}/${crypto.randomUUID()}-${safeName}`;
    const { error } = await this.supabase.requireClient().storage.from(bucket).upload(path, file, { upsert: false });
    if (error) throw new DataRequestError('Upload file', error);
    return path;
  }

  async signedUrl(bucket: PrivateBucket, path: string, expiresInSeconds = 300): Promise<string> {
    const { data, error } = await this.supabase.requireClient().storage.from(bucket).createSignedUrl(path, expiresInSeconds);
    if (error) throw new DataRequestError('Open file', error);
    return data.signedUrl;
  }

  async remove(bucket: PrivateBucket, path: string): Promise<void> {
    const { error } = await this.supabase.requireClient().storage.from(bucket).remove([path]);
    if (error) throw new DataRequestError('Remove file', error);
  }
}
