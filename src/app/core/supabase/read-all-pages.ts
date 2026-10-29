import { DataRequestError } from './data-error';
interface PageResult<T> {
  data: readonly T[] | null;
  error: { message: string } | null;
  count?: number | null;
}

/** Keep reading even when the server caps a response below our requested size. */
export async function readAllPages<T>(
  operation: string,
  fetchPage: (offset: number, limit: number) => PromiseLike<PageResult<T>>,
): Promise<T[]> {
  const rows: T[] = [];
  for (;;) {
    const result = await fetchPage(rows.length, 500);
    if (result.error) throw new DataRequestError(operation, result.error);
    const page = result.data ?? [];
    rows.push(...page);
    if (result.count != null && rows.length >= result.count) return rows;
    if (!page.length) {
      if (result.count != null && rows.length < result.count)
        throw new Error(`${operation}: Some records could not be loaded. Please retry.`);
      return rows;
    }
  }
}
