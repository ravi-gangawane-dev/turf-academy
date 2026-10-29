import { Injectable, inject, signal } from '@angular/core';
import { AttendanceOutboxOperation } from '../../core/models/academy.model';
import { API_CONFIG } from '../../core/config/api.config';
import { CoachPortalService } from './coach-portal.service';

const DB_NAME = 'turf-academy-coach-offline';
const STORE_NAME = 'attendance-outbox';

@Injectable({ providedIn: 'root' })
export class CoachAttendanceOutboxService {
  private readonly config = inject(API_CONFIG);
  private readonly portal = inject(CoachPortalService);
  private readonly memory = new Map<string, AttendanceOutboxOperation>();
  readonly operations = signal<readonly AttendanceOutboxOperation[]>([]);
  readonly online = signal(typeof navigator === 'undefined' ? true : navigator.onLine);
  readonly syncing = signal(false);

  constructor() {
    if (this.config.allowOfflineAttendance === true) void this.load();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.online.set(true);
        if (this.config.allowOfflineAttendance === true) void this.replay();
      });
      window.addEventListener('offline', () => this.online.set(false));
    }
  }

  async queueCheckIn(studentId: string, batchId: string): Promise<void> {
    this.requireOfflineEnabled();
    await this.save(this.operation('check-in', studentId, batchId));
  }

  async queueCheckOut(attendanceId: string, studentId: string, batchId: string): Promise<void> {
    this.requireOfflineEnabled();
    await this.save({ ...this.operation('check-out', studentId, batchId), attendanceId });
  }

  async replay(): Promise<void> {
    if (this.config.allowOfflineAttendance !== true || !this.online() || this.syncing()) return;
    this.syncing.set(true);
    try {
      for (const operation of this.operations().filter((item) => item.status !== 'conflict')) {
        await this.save({ ...operation, status: 'syncing' });
        try {
          if (operation.kind === 'check-in')
            await this.portal.checkIn(operation.studentId, operation.batchId, operation.id);
          else await this.portal.checkOut(operation.attendanceId!, operation.id);
          await this.delete(operation.id);
          this.operations.update((items) => items.filter((item) => item.id !== operation.id));
        } catch (error) {
          const reason = error instanceof Error ? error.message : 'Attendance sync failed.';
          const conflict = /already|duplicate|recorded|check-in required/i.test(reason);
          await this.save({
            ...operation,
            status: conflict ? 'conflict' : 'failed',
            failureReason: reason,
          });
        }
      }
    } finally {
      this.syncing.set(false);
    }
  }

  private requireOfflineEnabled(): void {
    if (this.config.allowOfflineAttendance !== true) {
      throw new Error('Attendance requires an online API connection. Reconnect and try again.');
    }
  }

  private async load(): Promise<void> {
    this.operations.set(await this.list());
    if (this.online()) await this.replay();
  }

  private async save(operation: AttendanceOutboxOperation): Promise<void> {
    await this.put(operation);
    this.operations.update((items) => [
      ...items.filter((item) => item.id !== operation.id),
      operation,
    ]);
  }

  private operation(
    kind: AttendanceOutboxOperation['kind'],
    studentId: string,
    batchId: string,
  ): AttendanceOutboxOperation {
    return {
      id: crypto.randomUUID(),
      kind,
      studentId,
      batchId,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
  }

  private async list(): Promise<readonly AttendanceOutboxOperation[]> {
    if (!globalThis.indexedDB) return [...this.memory.values()];
    const store = await this.store('readonly');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as AttendanceOutboxOperation[]);
      request.onerror = () => reject(request.error);
    });
  }

  private async put(operation: AttendanceOutboxOperation): Promise<void> {
    if (!globalThis.indexedDB) {
      this.memory.set(operation.id, operation);
      return;
    }
    const store = await this.store('readwrite');
    await new Promise<void>((resolve, reject) => {
      const request = store.put(operation);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async delete(id: string): Promise<void> {
    if (!globalThis.indexedDB) {
      this.memory.delete(id);
      return;
    }
    const store = await this.store('readwrite');
    await new Promise<void>((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async store(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return database.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
  }
}
