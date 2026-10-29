import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { DatabaseService } from '../../core/supabase/database.service';
import { SettingsToolsPage } from './settings-tools-page';

function exportPage(
  read: () => Promise<{ data: object[] | null; error: { message: string } | null }>,
) {
  const query = {
    select: () => query,
    range: () => query,
    order: () => query,
    then: (resolve: (result: unknown) => unknown) => read().then(resolve),
  };
  const client = { from: vi.fn(() => query) };
  TestBed.configureTestingModule({
    imports: [SettingsToolsPage],
    providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { data: { settingsTool: 'backup' } } } },
      { provide: DatabaseService, useValue: { client } },
    ],
  });
  // Spec files share one jsdom global in this worker, so start from a clean call
  // history in case another spec left a spy on `URL.createObjectURL`.
  const download = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:export');
  download.mockClear();
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  return { page: TestBed.createComponent(SettingsToolsPage).componentInstance, client, download };
}
describe('Settings tools', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    localStorage.removeItem('academy-theme');
    delete document.documentElement.dataset['academyTheme'];
    vi.restoreAllMocks();
  });
  it('applies and persists an appearance choice', () => {
    TestBed.configureTestingModule({
      imports: [SettingsToolsPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { data: { settingsTool: 'theme' } } } },
        { provide: DatabaseService, useValue: {} },
      ],
    });
    const page = TestBed.createComponent(SettingsToolsPage).componentInstance;
    page['setTheme']('blue');
    expect(document.documentElement.dataset['academyTheme']).toBe('blue');
    expect(localStorage.getItem('academy-theme')).toBe('blue');
  });
  it('exports every page and uses real composite keys for tables without an ID', async () => {
    const orders: Record<string, string[]> = {};
    const offsets: number[] = [];
    const client = {
      from: (table: string) => {
        const q = {
          select: () => q,
          range: (from: number) => {
            offsets.push(from);
            return q;
          },
          order: (key: string) => {
            (orders[table] ??= []).push(key);
            return q;
          },
          then: (resolve: (r: unknown) => unknown) => {
            const last = offsets[offsets.length - 1];
            return Promise.resolve(
              resolve({
                data:
                  table === 'students'
                    ? Array.from({ length: last === 0 ? 500 : 1 }, (_, id) => ({
                        id: Number(last) + id,
                      }))
                    : [],
                error: null,
              }),
            );
          },
        };
        return q;
      },
    };
    TestBed.configureTestingModule({
      imports: [SettingsToolsPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { data: { settingsTool: 'backup' } } } },
        { provide: DatabaseService, useValue: { client } },
      ],
    });
    const download = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:export');
    download.mockClear();
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const page = TestBed.createComponent(SettingsToolsPage).componentInstance;
    await page['exportData']();
    expect(page['error']()).toBe('');
    expect(page['message']()).toBe('Academy records exported.');
    expect(offsets).toContain(500);
    expect(orders['coach_specializations']).toEqual(['coach_id', 'specialization']);
    expect(orders['batch_days']).toEqual(['batch_id', 'day_of_week']);
    expect(orders['student_parents']).toEqual(['student_id', 'parent_id']);
    expect(orders['batch_coaches']).toEqual(['batch_id', 'coach_id']);
    const json = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(download.mock.calls[0][0] as Blob);
    });
    const exported = JSON.parse(json);
    expect(exported.format).toBe('turf-academy-records-v1');
    expect(exported.records.students).toHaveLength(501);
    expect(exported.records.students[500]).toEqual({ id: 500 });
    expect(exported.records).not.toHaveProperty('qr_profiles');
    expect(exported.records).not.toHaveProperty('audit_logs');
  });
  it('clears old success after failure, avoids partial downloads and allows retry', async () => {
    let fail = false;
    const { page, download } = exportPage(async () =>
      fail ? { data: null, error: { message: 'Connection lost' } } : { data: [], error: null },
    );
    await page['exportData']();
    fail = true;
    await page['exportData']();
    expect(page['error']()).toContain('export could not be completed');
    expect(page['message']()).toBe('');
    expect(page['busy']()).toBe(false);
    expect(page['progress']()).toBe('');
    expect(download).toHaveBeenCalledTimes(1);
    fail = false;
    await page['exportData']();
    expect(page['error']()).toBe('');
    expect(download).toHaveBeenCalledTimes(2);
  });
  it('prevents overlapping exports while a request is pending', async () => {
    let finish!: (result: { data: object[]; error: null }) => void;
    const pending = new Promise<{ data: object[]; error: null }>((resolve) => {
      finish = resolve;
    });
    const { page, client, download } = exportPage(() => pending);
    const first = page['exportData']();
    await page['exportData']();
    expect(page['busy']()).toBe(true);
    expect(client.from).toHaveBeenCalledTimes(1);
    finish({ data: [], error: null });
    await first;
    expect(download).toHaveBeenCalledTimes(1);
    expect(page['busy']()).toBe(false);
  });
});
