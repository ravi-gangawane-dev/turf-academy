import { TestBed } from '@angular/core/testing';
import { DatabaseService } from './database.service';
import {
  ACADEMY_BACKUP_TABLES,
  AcademyBackupService,
} from './academy-backup.service';

interface QueryCalls {
  readonly selects: { table: string; columns: string }[];
  readonly ranges: { table: string; from: number; to: number }[];
  readonly orders: { table: string; column: string }[];
}

function setup(options: {
  rows?: Record<string, unknown[]>;
  errors?: ReadonlySet<string>;
  nullData?: ReadonlySet<string>;
} = {}) {
  const calls: QueryCalls = { selects: [], ranges: [], orders: [] };
  const rows = options.rows ?? {};
  const from = vi.fn((table: string) => {
    let start = 0;
    let end = 0;
    const query = {
      select: vi.fn((columns: string) => {
        calls.selects.push({ table, columns });
        return query;
      }),
      range: vi.fn((offset: number, limit: number) => {
        start = offset;
        end = limit;
        calls.ranges.push({ table, from: offset, to: limit });
        return query;
      }),
      order: vi.fn((column: string) => {
        calls.orders.push({ table, column });
        return query;
      }),
      then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => {
        const error = options.errors?.has(table)
          ? { code: 'PGRST100', message: 'read failed' }
          : null;
        const data = options.nullData?.has(table) ? null : (rows[table] ?? []).slice(start, end + 1);
        return Promise.resolve({ data, error }).then(resolve, reject);
      },
    };
    return query;
  });

  TestBed.configureTestingModule({
    providers: [
      AcademyBackupService,
      { provide: DatabaseService, useValue: { client: { from } } },
    ],
  });
  return { service: TestBed.inject(AcademyBackupService), from, calls };
}

describe('AcademyBackupService', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  it('reads every promised table and returns them under their real names', async () => {
    const { service, calls } = setup();
    const records = await service.readRecords();

    expect(Object.keys(records)).toEqual([...ACADEMY_BACKUP_TABLES]);
    expect(calls.selects).toHaveLength(ACADEMY_BACKUP_TABLES.length);
    expect(calls.selects.find((entry) => entry.table === 'students')?.columns).toBe('*');
  });

  it('selects safe profile and notification columns instead of every field', async () => {
    const { service, calls } = setup();
    await service.readRecords();

    expect(calls.selects.find((entry) => entry.table === 'profiles')?.columns).toBe(
      'id,full_name,email,phone,role,status,is_active,created_at',
    );
    const notificationColumns = calls.selects.find(
      (entry) => entry.table === 'notifications',
    )?.columns;
    expect(notificationColumns).toContain('recipient');
    expect(notificationColumns).not.toContain('*');
  });

  it('orders by id, or by a composite key for link tables', async () => {
    const { service, calls } = setup();
    await service.readRecords();

    expect(calls.orders.filter((entry) => entry.table === 'students')).toEqual([
      { table: 'students', column: 'id' },
    ]);
    expect(calls.orders.filter((entry) => entry.table === 'student_parents')).toEqual([
      { table: 'student_parents', column: 'student_id' },
      { table: 'student_parents', column: 'parent_id' },
    ]);
  });

  it('pages large tables until the last short page', async () => {
    const students = Array.from({ length: 501 }, (_, index) => ({ id: `s-${index}` }));
    const { service, calls } = setup({ rows: { students } });
    const records = await service.readRecords();

    expect(records['students']).toHaveLength(501);
    expect(calls.ranges.filter((entry) => entry.table === 'students')).toEqual([
      { table: 'students', from: 0, to: 499 },
      { table: 'students', from: 500, to: 999 },
    ]);
    expect(calls.ranges.filter((entry) => entry.table === 'parents')).toHaveLength(1);
  });

  it('reports each table as it is read so the UI can show progress', async () => {
    const { service } = setup();
    const progress: string[] = [];

    await service.readRecords((table) => progress.push(table));

    expect(progress).toEqual([...ACADEMY_BACKUP_TABLES]);
  });

  it('stops with one friendly message when a table cannot be read', async () => {
    const { service } = setup({ errors: new Set(['payments']) });

    await expect(service.readRecords()).rejects.toThrow(
      'The export could not be completed. Please try again.',
    );
  });

  it('rejects a table that returns no data at all', async () => {
    const { service } = setup({ nullData: new Set(['students']) });

    await expect(service.readRecords()).rejects.toThrow(
      'Could not export students: no data returned.',
    );
  });

  it('builds a versioned backup with a fixed export timestamp', async () => {
    const { service } = setup({ rows: { students: [{ id: 's-1' }] } });
    const backup = await service.createBackup(new Date('2026-11-03T06:00:00Z'));

    expect(backup.format).toBe('turf-academy-records-v1');
    expect(backup.exportedAt).toBe('2026-11-03T06:00:00.000Z');
    expect(backup.records['students']).toEqual([{ id: 's-1' }]);
  });

  it('downloads one JSON file and returns the total row count', async () => {
    const anchors: HTMLAnchorElement[] = [];
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      const element = createElement(tag);
      if (tag === 'a') anchors.push(element as HTMLAnchorElement);
      return element;
    }) as typeof document.createElement);
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:backup');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    const { service } = setup({
      rows: {
        students: [{ id: 's-1' }, { id: 's-2' }],
        parents: [{ id: 'p-1' }],
      },
    });

    const total = await service.download(
      undefined,
      new Date('2026-11-03T06:00:00Z'),
    );

    expect(total).toBe(3);
    expect(anchors).toHaveLength(1);
    expect(anchors[0].download).toBe('academy-records-2026-11-03.json');
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    const payload = JSON.parse(await blob.text());
    expect(payload.format).toBe('turf-academy-records-v1');
    expect(payload.records.students).toHaveLength(2);
  });
});
