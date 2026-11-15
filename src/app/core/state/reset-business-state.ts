import { environment } from '../../../environments/environment';
import { LOCAL_KEYS, localStore } from './local-store';

/** One-time removal of stale business state after the approved test-data reset. */
export async function clearResetBusinessState(): Promise<void> {
  if (environment.useMockApi || !environment.supabaseUrl.includes('ttuigbkaluozglzgepsh')) return;
  const marker = LOCAL_KEYS.dataResetMarker;
  try {
    if (localStore.read(marker) === 'complete') return;
    localStore.remove(LOCAL_KEYS.parentSelectedChild);
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
    localStore.write(marker, 'complete');
  } catch {
    // Retry on next load; online-only attendance cannot replay these legacy queues.
    console.warn('Academy data cleanup will retry on the next page load.');
  }
}
