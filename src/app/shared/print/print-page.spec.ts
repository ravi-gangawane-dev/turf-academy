import { printPageLabel, printPages } from './print-page';

describe('printPages', () => {
  it('splits rows into a shorter first sheet and full continuation sheets', () => {
    const pages = printPages(Array.from({ length: 30 }, (_, index) => index + 1), 12, 20);

    expect(pages).toHaveLength(2);
    expect(pages[0]).toMatchObject({ index: 1, total: 2, offset: 0, last: false });
    expect(pages[0].rows).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(pages[1]).toMatchObject({ index: 2, total: 2, offset: 12, last: true });
    expect(pages[1].rows).toHaveLength(18);
  });

  it('carries continuous offsets across three or more pages', () => {
    const pages = printPages(Array.from({ length: 41 }, (_, index) => index), 10, 15);

    expect(pages.map((page) => page.offset)).toEqual([0, 10, 25, 40]);
    expect(pages.map((page) => page.rows.length)).toEqual([10, 15, 15, 1]);
    expect(pages.map((page) => page.index)).toEqual([1, 2, 3, 4]);
    expect(pages.map((page) => page.total)).toEqual([4, 4, 4, 4]);
    expect(pages.map((page) => page.last)).toEqual([false, false, false, true]);
  });

  it('keeps every row when the count divides exactly', () => {
    const pages = printPages(['a', 'b', 'c'], 2, 1);

    expect(pages.map((page) => page.rows)).toEqual([['a', 'b'], ['c']]);
    expect(pages.every((page) => page.total === 2)).toBe(true);
  });

  it('renders one empty page for an empty document so the footer still prints', () => {
    const pages = printPages([], 12, 20);

    expect(pages).toEqual([
      { index: 1, total: 1, rows: [], offset: 0, last: true },
    ]);
  });

  it('falls back to the first-page size for continuation sheets', () => {
    const pages = printPages([1, 2, 3, 4, 5], 2);

    expect(pages.map((page) => page.rows)).toEqual([[1, 2], [3, 4], [5]]);
  });
});

describe('printPageLabel', () => {
  it('uses one-based wording for the repeated footer', () => {
    expect(printPageLabel(1, 3)).toBe('Page 1 of 3');
    expect(printPageLabel(3, 3)).toBe('Page 3 of 3');
    expect(printPageLabel(1, 1)).toBe('Page 1 of 1');
  });
});
