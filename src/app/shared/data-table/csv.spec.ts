import { createCsv, csvCell, downloadCsv } from './csv';

describe('csv', () => {
  afterEach(() => vi.restoreAllMocks());

  it('quotes cells and doubles embedded quotes', () => {
    expect(csvCell('Aarav "Ace" Sharma')).toBe('"Aarav ""Ace"" Sharma"');
    expect(csvCell('multi\nline\tvalue')).toBe('"multi line value"');
    expect(csvCell(null)).toBe('""');
    expect(csvCell(undefined)).toBe('""');
  });

  it('neutralises spreadsheet formula prefixes in text', () => {
    expect(csvCell('=SUM(A1:A3)')).toBe('"\'=SUM(A1:A3)"');
    expect(csvCell('+91 98765 43210')).toBe('"\'+91 98765 43210"');
    expect(csvCell('-2 days')).toBe('"\'-2 days"');
    expect(csvCell('@account')).toBe('"\'@account"');
  });

  it('keeps numeric negatives and booleans as data', () => {
    expect(csvCell(-120.5)).toBe('"-120.5"');
    expect(csvCell(true)).toBe('"true"');
    expect(csvCell(false)).toBe('"false"');
  });

  it('joins rows with CRLF line endings', () => {
    expect(
      createCsv([
        ['Student', 'Amount'],
        ['Aarav', 1250.5],
      ]),
    ).toBe('"Student","Amount"\r\n"Aarav","1250.5"');
  });

  it('downloads a BOM-prefixed CSV and appends the extension once', async () => {
    const created: HTMLAnchorElement[] = [];
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      const element = createElement(tag);
      if (tag === 'a') created.push(element as HTMLAnchorElement);
      return element;
    }) as typeof document.createElement);
    const createObjectURL = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:csv');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    vi.useFakeTimers();
    try {
      downloadCsv('students', [['Name'], ['Aarav']]);
      vi.runAllTimers();
    } finally {
      vi.useRealTimers();
    }

    expect(created).toHaveLength(1);
    expect(created[0].download).toBe('students.csv');
    expect(created[0].href).toContain('blob:csv');
    expect(click).toHaveBeenCalledOnce();
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:csv');

    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toBe('text/csv;charset=utf-8');
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(new TextDecoder().decode(bytes.slice(3))).toBe('"Name"\r\n"Aarav"');
  });

  it('does not duplicate an existing csv extension', () => {
    const created: HTMLAnchorElement[] = [];
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      const element = createElement(tag);
      if (tag === 'a') created.push(element as HTMLAnchorElement);
      return element;
    }) as typeof document.createElement);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:csv');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    downloadCsv('parents.csv', [['Name']]);

    expect(created[0].download).toBe('parents.csv');
  });
});
