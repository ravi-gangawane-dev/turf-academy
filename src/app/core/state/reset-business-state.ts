import { environment } from '../../../environments/environment';

/** One-time removal of stale business state after the approved test-data reset. */
export async function clearResetBusinessState(): Promise<void> {
  if (environment.useMockApi || !environment.supabaseUrl.includes('ttuigbkaluozglzgepsh')) return;
  const marker = 'turf-academy-data-reset-2026-10-28';
  try {
    if (localStorage.getItem(marker) === 'complete') return;
    localStorage.removeItem('parent-selected-child');
    sessionStorage.removeItem('turf-academy-session');
    if (globalThis.indexedDB) {
      await Promise.all(['turf-academy-offline', 'turf-academy-coach-offline'].map(name =>
        new Promise<void>((resolve, reject) => {
          const request = indexedDB.deleteDatabase(name);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
          request.onblocked = () => reject(new Error('Close older academy tabs to finish clearing stale offline data.'));
        }),
      ));
    }
    localStorage.setItem(marker, 'complete');
  } catch {
    // Retry on next load; online-only attendance cannot replay these legacy queues.
    console.warn('Academy data cleanup will retry on the next page load.');
  }
}
