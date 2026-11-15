import { Injectable } from '@angular/core';

/** Device-local preference keys owned by the app. */
export const LOCAL_KEYS = {
  theme: 'academy-theme',
  parentSelectedChild: 'parent-selected-child',
  printPageSetup: 'academy-print-page-setup',
  dataResetMarker: 'turf-academy-data-reset-2026-10-28',
} as const;

/**
 * The single door to `localStorage`. Every call is guarded: storage can be
 * disabled by browser settings, full, or absent during server rendering, and
 * none of those may break a page.
 */
@Injectable({ providedIn: 'root' })
export class LocalStore {
  read(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  /** Returns false when the browser refused the write, so callers can say so. */
  write(key: string, value: string): boolean {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Nothing to clean up when storage is unavailable.
    }
  }

  readJson<T>(key: string): T | null {
    const raw = this.read(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  writeJson(key: string, value: unknown): boolean {
    return this.write(key, JSON.stringify(value));
  }
}

/** For bootstrap code that runs outside the injector. */
export const localStore = new LocalStore();
