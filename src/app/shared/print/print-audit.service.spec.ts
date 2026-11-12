import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../core/auth/auth.service';
import { DatabaseService } from '../../core/supabase/database.service';
import { PrintAuditService } from './print-audit.service';

const session = {
  accessToken: 'token',
  user: { id: 'user-1', name: 'Ravi Admin', role: 'admin' },
  profile: { id: 'user-1', fullName: 'Ravi Admin', email: 'admin@example.com', role: 'admin', status: 'active' },
};

function setup(options: {
  insert?: ReturnType<typeof vi.fn>;
  session?: unknown;
  role?: string | null;
} = {}) {
  const insert = options.insert ?? vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn(() => ({ insert }));
  TestBed.configureTestingModule({
    providers: [
      PrintAuditService,
      { provide: DatabaseService, useValue: { client: { from } } },
      {
        provide: AuthService,
        useValue: {
          session: signal(options.session !== undefined ? options.session : session),
          role: signal(options.role !== undefined ? options.role : 'admin'),
        },
      },
    ],
  });
  return { service: TestBed.inject(PrintAuditService), insert, from };
}

describe('PrintAuditService', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  it('records the actor, document and output format', async () => {
    const { service, insert, from } = setup();

    await service.record({
      action: 'download',
      documentKind: 'receipt',
      reference: 'RCP-42',
      format: 'pdf',
      metadata: { rows: 1 },
    });

    expect(from).toHaveBeenCalledWith('print_audit_events');
    expect(insert).toHaveBeenCalledWith({
      actor_id: 'user-1',
      actor_role: 'admin',
      action: 'download',
      document_kind: 'receipt',
      document_reference: 'RCP-42',
      format: 'pdf',
      metadata: { rows: 1 },
    });
  });

  it('trims over-long document kinds and references to the column limits', async () => {
    const { service, insert } = setup();

    await service.record({
      action: 'print',
      documentKind: 'k'.repeat(120),
      reference: 'r'.repeat(260),
      format: 'print',
    });

    const [row] = insert.mock.calls[0];
    expect(row.document_kind).toHaveLength(80);
    expect(row.document_reference).toHaveLength(200);
    expect(row.metadata).toEqual({});
  });

  it('stores a null actor for a session-less parent or public viewer', async () => {
    const { service, insert } = setup({ session: null, role: null });

    await service.record({
      action: 'preview',
      documentKind: 'statement',
      reference: 'FES-1',
      format: 'print',
    });

    const [row] = insert.mock.calls[0];
    expect(row.actor_id).toBeNull();
    expect(row.actor_role).toBeNull();
  });

  it('swallows a rejected insert so printing is never blocked', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { service } = setup({ insert: vi.fn().mockRejectedValue(new Error('offline')) });

    await expect(
      service.record({
        action: 'print',
        documentKind: 'invoice',
        reference: 'INV-1',
        format: 'print',
      }),
    ).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith('print audit event not recorded', expect.any(Error));
  });

  it('logs an insert error without surfacing it to the caller', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { service } = setup({
      insert: vi.fn().mockResolvedValue({ error: { code: '42501', message: 'denied' } }),
    });

    await service.record({
      action: 'download',
      documentKind: 'table',
      reference: 'students',
      format: 'csv',
    });

    expect(warn).toHaveBeenCalledWith('print audit event not recorded', { code: '42501' });
  });

  it('contains failures while resolving the actor before a database write', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { service, insert } = setup();
    vi.spyOn(TestBed.inject(AuthService), 'session').mockImplementation(() => { throw new Error('Session unavailable'); });
    await expect(service.record({ action: 'download', documentKind: 'table', reference: 'attendance', format: 'csv' })).resolves.toBeUndefined();
    expect(insert).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
  });

  it('fires and forgets without waiting for the round trip', async () => {
    const { service, insert } = setup();

    expect(() =>
      service.recordInBackground({
        action: 'download',
        documentKind: 'table',
        reference: 'students',
        format: 'json',
      }),
    ).not.toThrow();

    await vi.waitFor(() => expect(insert).toHaveBeenCalledOnce());
  });
});
