import { inject } from '@angular/core';
import { ParamMap, Params, RedirectFunction, Router } from '@angular/router';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '../../shared/pagination/pagination.config';

export const NOTIFICATION_CHANNELS = ['in_app', 'whatsapp', 'email', 'sms'] as const;
export const NOTIFICATION_STATUSES = ['queued', 'sending', 'sent', 'delivered', 'failed'] as const;
export const NOTIFICATION_SORTS = [
  'createdAt',
  'subject',
  'recipient',
  'status',
  'channel',
  'templateKey',
] as const;
export const NOTIFICATION_COLUMNS = [
  'subject',
  'recipient',
  'channel',
  'templateKey',
  'status',
  'createdAt',
] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];
export interface NotificationQuery {
  channel: string;
  status: 'all' | NotificationStatus;
  type: string;
  search: string;
  studentName: string;
  studentId: string;
  recipientId: string;
  batchId: string;
  from: string;
  to: string;
  page: number;
  pageSize: number;
  sort: (typeof NOTIFICATION_SORTS)[number];
  direction: 'asc' | 'desc';
  columns: Record<string, string>;
}

export function validNotificationDate(value: string | null): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : '';
}

export function readNotificationQuery(params: ParamMap): NotificationQuery {
  const channel = params.get('channel') ?? '';
  const status = params.get('status') ?? '';
  const sort = params.get('sort') ?? '';
  const page = Number(params.get('page') ?? 1);
  const size = Number(params.get('pageSize') ?? DEFAULT_PAGE_SIZE);
  let from = validNotificationDate(params.get('from'));
  let to = validNotificationDate(params.get('to'));
  if (from && to && from > to) [from, to] = [to, from];
  const columns = Object.fromEntries(
    NOTIFICATION_COLUMNS.flatMap((key) => {
      const raw = (params.get(`cf_${key}`) ?? '').trim().slice(0, 200);
      const value = key === 'createdAt' ? validNotificationDate(raw) : raw;
      return value ? [[key, value]] : [];
    }),
  );
  return {
    channel: (NOTIFICATION_CHANNELS as readonly string[]).includes(channel) ? channel : '',
    status: (NOTIFICATION_STATUSES as readonly string[]).includes(status)
      ? (status as NotificationStatus)
      : 'all',
    type: (params.get('type') ?? '').trim().slice(0, 120) || 'all',
    studentName: (params.get('student') ?? '').trim().slice(0, 200),
    studentId: notificationEntityId(params.get('studentId')),
    recipientId: /^(parent|coach):[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(
      params.get('recipientId') ?? '',
    )
      ? params.get('recipientId')!.toLowerCase()
      : '',
    batchId:
      params.get('batchId') === 'unlinked'
        ? 'unlinked'
        : notificationEntityId(params.get('batchId')),
    search: (params.get('search') ?? '').trim().slice(0, 200),
    from,
    to,
    page: Number.isSafeInteger(page) && page > 0 ? Math.min(page, 1000000) : 1,
    pageSize: PAGE_SIZE_OPTIONS.includes(size) ? size : DEFAULT_PAGE_SIZE,
    sort: (NOTIFICATION_SORTS as readonly string[]).includes(sort)
      ? (sort as NotificationQuery['sort'])
      : 'createdAt',
    direction: params.get('direction') === 'asc' ? 'asc' : 'desc',
    columns,
  };
}

export function notificationQueryParams(query: NotificationQuery): Params {
  return {
    ...(query.channel ? { channel: query.channel } : {}),
    ...(query.status !== 'all' ? { status: query.status } : {}),
    ...(query.type !== 'all' ? { type: query.type } : {}),
    ...(query.studentName.trim() ? { student: query.studentName.trim() } : {}),
    ...(query.studentId ? { studentId: query.studentId } : {}),
    ...(query.recipientId ? { recipientId: query.recipientId } : {}),
    ...(query.batchId ? { batchId: query.batchId } : {}),
    ...(query.search.trim() ? { search: query.search.trim() } : {}),
    ...(query.from ? { from: query.from } : {}),
    ...(query.to ? { to: query.to } : {}),
    ...(query.page > 1 ? { page: query.page } : {}),
    ...(query.pageSize !== DEFAULT_PAGE_SIZE ? { pageSize: query.pageSize } : {}),
    ...(query.sort !== 'createdAt' ? { sort: query.sort } : {}),
    ...(query.direction !== 'desc' ? { direction: query.direction } : {}),
    ...Object.fromEntries(
      NOTIFICATION_COLUMNS.flatMap((key) => {
        const value = query.columns[key]?.trim();
        return value ? [[`cf_${key}`, value]] : [];
      }),
    ),
  };
}

function notificationEntityId(value: string | null): string {
  return /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value ?? '')
    ? value!.toLowerCase()
    : '';
}

/** Preserve bookmarks and additional filters while moving old views to one page. */
export function notificationRedirect(preset: Params = {}): RedirectFunction {
  return ({ queryParams }) =>
    inject(Router).createUrlTree(['/notifications'], {
      queryParams: { ...queryParams, ...preset },
    });
}
