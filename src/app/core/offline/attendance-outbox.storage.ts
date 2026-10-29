import { Injectable } from '@angular/core';
import { AttendanceOutboxOperation } from '../models/academy.model';

const DB_NAME = 'turf-academy-offline';
const STORE_NAME = 'attendance-outbox';
// Pre-merge coach portal outbox. Operations the coach stack queued there
// before C-07 merged it into the shared outbox are imported once and cleared,
// so a coach's stranded offline actions still replay instead of being lost.
const LEGACY_COACH_DB_NAME = 'turf-academy-coach-offline';

@Injectable({ providedIn: 'root' })
export class AttendanceOutboxStorage {
  private readonly memory = new Map<string, AttendanceOutboxOperation>();
  private legacyImported = false;

  async list(): Promise<readonly AttendanceOutboxOperation[]> {
    if (!globalThis.indexedDB) return [...this.memory.values()];
    const store = await this.store('readonly');
    const rows = await new Promise<readonly AttendanceOutboxOperation[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as AttendanceOutboxOperation[]);
      request.onerror = () => reject(request.error);
    });
    return this.importLegacyCoachOperations(rows);
  }

  async put(operation: AttendanceOutboxOperation): Promise<void> {
    if (!globalThis.indexedDB) { this.memory.set(operation.id, operation); return; }
    const store = await this.store('readwrite');
    await new Promise<void>((resolve, reject) => { const request = store.put(operation); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); });
  }

  async delete(id: string): Promise<void> {
    if (!globalThis.indexedDB) { this.memory.delete(id); return; }
    const store = await this.store('readwrite');
    await new Promise<void>((resolve, reject) => { const request = store.delete(id); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); });
  }

  private async importLegacyCoachOperations(
    rows: readonly AttendanceOutboxOperation[],
  ): Promise<readonly AttendanceOutboxOperation[]> {
    if (this.legacyImported) return rows;
    this.legacyImported = true;
    try {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(LEGACY_COACH_DB_NAME);
        request.onupgradeneeded = () => undefined; // never create stores in the legacy database
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      let legacy: readonly AttendanceOutboxOperation[] = [];
      if (database.objectStoreNames.contains(STORE_NAME))
        legacy = await new Promise<readonly AttendanceOutboxOperation[]>((resolve, reject) => {
          const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
          request.onsuccess = () => resolve(request.result as AttendanceOutboxOperation[]);
          request.onerror = () => reject(request.error);
        });
      const known = new Set(rows.map((row) => row.id));
      const stranded = legacy.filter((operation) => !known.has(operation.id));
      for (const operation of stranded) await this.put(operation);
      // The legacy store is retired once its operations live in the shared queue.
      database.close();
      indexedDB.deleteDatabase(LEGACY_COACH_DB_NAME);
      return [...rows, ...stranded];
    } catch {
      // A missing or unreadable legacy store must never block the shared queue.
      return rows;
    }
  }

  private async store(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: 'id' }); };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return database.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
  }
}
