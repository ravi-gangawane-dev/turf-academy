/** Public messages for database failures; never include SQL, table names or provider details. */
export function dataErrorMessage(error: unknown): string {
  const value = error as { code?: string; message?: string; status?: number } | null;
  const code = value?.code;
  if (code === '23505') return 'This record already exists. Check the details and try again.';
  if (code === '23503')
    return 'This record is linked to other records. Review those links before making this change.';
  if (code === '23514' || code === '23502' || code === '22P02')
    return 'Some details are missing or invalid. Check the form and try again.';
  if (code === '42P01' || code === 'PGRST205')
    return 'This feature is not configured in the database yet. Ask an administrator to apply the latest database migration.';
  if (code === '42501' || value?.status === 403)
    return 'You do not have permission to perform this action. Contact the academy administrator.';
  if (code === 'PGRST301' || value?.status === 401)
    return 'Your session has expired. Please sign in again.';
  if (/fetch|network|offline|connection/i.test(value?.message ?? ''))
    return 'Unable to connect. Check your internet connection and try again.';
  return 'This request could not be completed. Please try again. If the problem continues, contact the academy administrator.';
}

export class DataRequestError extends Error {
  constructor(
    readonly operation: string,
    cause: unknown,
  ) {
    super(dataErrorMessage(cause), { cause });
    this.name = 'DataRequestError';
  }
}
