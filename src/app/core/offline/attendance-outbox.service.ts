import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HttpAttendanceRepository } from '../api/http-academy.repositories';
import { AttendanceOutboxOperation } from '../models/academy.model';
import { AcademyStore } from '../state/academy.store';
import { AttendanceOutboxStorage } from './attendance-outbox.storage';
import { API_CONFIG } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class AttendanceOutboxService {
  private readonly storage = inject(AttendanceOutboxStorage);
  private readonly api = inject(HttpAttendanceRepository);
  private readonly state = inject(AcademyStore);
  private readonly config = inject(API_CONFIG);
  readonly operations = signal<readonly AttendanceOutboxOperation[]>([]);
  readonly online = signal(typeof navigator === 'undefined' ? true : navigator.onLine);
  readonly syncing = signal(false);
  readonly lastSyncAt = signal<string | null>(null);
  readonly syncAttempts = signal<readonly { readonly at: string; readonly synced: number; readonly failed: number }[]>([]);

  constructor() {
    if (this.config.allowOfflineAttendance === true && this.config.backend !== 'mock') void this.load();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => { this.online.set(true); if (this.config.allowOfflineAttendance === true && this.config.backend !== 'mock') void this.replay(); });
      window.addEventListener('offline', () => this.online.set(false));
    }
  }

  async queueCheckIn(studentId: string, batchId: string, source: 'manual' | 'qr' = 'manual'): Promise<void> {
    this.requireOfflineEnabled();
    const operation = { ...this.operation('check-in', studentId, batchId), source };
    this.state.addPendingCheckIn(operation.id, studentId, batchId);
    await this.save(operation);
  }

  async queueCheckOut(attendanceId: string, studentId: string, batchId: string): Promise<void> {
    this.requireOfflineEnabled();
    const operation = { ...this.operation('check-out', studentId, batchId), attendanceId };
    this.state.markPendingCheckOut(operation.id, attendanceId);
    await this.save(operation);
  }

  async retry(id?: string): Promise<void> {
    if (id) {
      const operation = this.operations().find((item) => item.id === id);
      if (operation) await this.save({ ...operation, status: 'pending', failureReason: undefined });
    }
    await this.replay();
  }

  async discard(id: string): Promise<void> {
    await this.storage.delete(id);
    this.operations.update((items) => items.filter((item) => item.id !== id));
  }

  async clear(): Promise<void> {
    await Promise.all(this.operations().map((operation) => this.storage.delete(operation.id)));
    this.operations.set([]);
  }

  async replay(): Promise<void> {
    if (this.config.allowOfflineAttendance !== true || !this.online() || this.syncing()) return;
    this.syncing.set(true);
    let synced = 0;
    let failed = 0;
    try {
    for (const operation of this.operations().filter((item) => item.status === 'pending' || item.status === 'failed')) {
      await this.save({ ...operation, status: 'syncing' });
      try {
        const record = operation.kind === 'check-in'
          ? await firstValueFrom(this.api.checkIn(operation.studentId, operation.batchId, operation.source ?? 'manual', operation.id))
          : await firstValueFrom(this.api.checkOut(operation.attendanceId!, operation.id));
        this.state.reconcileAttendance(operation.id, record);
        await this.storage.delete(operation.id);
        this.operations.update((items) => items.filter((item) => item.id !== operation.id));
        synced++;
      } catch (error) {
        const status = typeof error === 'object' && error && 'status' in error ? Number((error as { status: number }).status) : 0;
        const nextStatus = status === 409 ? 'conflict' as const : 'failed' as const;
        const reason = typeof error === 'object' && error && 'error' in error ? (error as { error?: { message?: string } }).error?.message : undefined;
        await this.save({ ...operation, status: nextStatus, failureReason: reason ?? (nextStatus === 'conflict' ? 'Server attendance conflicts with this offline action.' : 'Sync failed. Retry when the connection is stable.') });
        this.state.markAttendanceSyncState(operation.id, operation.attendanceId, nextStatus);
        failed++;
      }
    }
    } finally {
      const at = new Date().toISOString();
      this.lastSyncAt.set(at);
      this.syncAttempts.update((items) => [{ at, synced, failed }, ...items].slice(0, 5));
      this.syncing.set(false);
    }
  }

  private requireOfflineEnabled(): void {
    if (this.config.allowOfflineAttendance !== true) {
      throw new Error('Attendance requires an online API connection. Reconnect and try again.');
    }
  }

  private async load(): Promise<void> { this.operations.set(await this.storage.list()); if (this.online()) await this.replay(); }
  private async save(operation: AttendanceOutboxOperation): Promise<void> { await this.storage.put(operation); this.operations.update((items) => [...items.filter((item) => item.id !== operation.id), operation]); }
  private operation(kind: 'check-in' | 'check-out', studentId: string, batchId: string): AttendanceOutboxOperation { return { id: globalThis.crypto?.randomUUID?.() ?? `offline-${Date.now()}-${Math.random()}`, kind, studentId, batchId, createdAt: new Date().toISOString(), status: 'pending' }; }
}
