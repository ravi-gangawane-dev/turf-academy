import { inject, Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { DataRequestError } from './data-error';
export type ListResource = 'plans' | 'discounts' | 'late-fees' | 'summary' | 'pending' | 'coaches' | 'enrollments' | 'allocations' | 'batches';
export interface ServerListPage<T, M = Record<string, number>, O = Record<string, unknown>> {
 rows: T[]; total: number; page: number; metrics: M; options: O;
 totals: { count: number; base: number; discount: number; late: number; final: number; paid: number; balance: number };
}
@Injectable({ providedIn: 'root' })
export class ServerListService {
 private readonly db = inject(DatabaseService);
 async page<T, M = Record<string, number>, O = Record<string, unknown>>(
  resource: ListResource, page: number, size: number, filters: Record<string, string> = {},
 ): Promise<ServerListPage<T, M, O>> {
  const result = await this.db.client.rpc('get_staff_list_page', {
   p_resource: resource, p_page: page, p_size: size, p_filters: filters,
  });
  if (result.error) throw new DataRequestError('Load list page', result.error);
  return result.data as ServerListPage<T, M, O>;
 }
 async all<T>(resource: ListResource, filters: Record<string, string>): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 1; ; page++) {
   const result = await this.page<T>(resource, page, 100, filters);
   if (result.page !== page) break;
   rows.push(...result.rows);
   if (rows.length >= result.total || !result.rows.length) return rows;
  }
  return rows;
 }
}
