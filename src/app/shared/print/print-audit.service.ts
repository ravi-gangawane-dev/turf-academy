import { inject, Injectable } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { DatabaseService } from '../../core/supabase/database.service';
import { PrintAuditEvent } from './print-audit.models';

/**
 * Records who generated which document, in which format and when.
 *
 * Auditing must never block or break a print, so failures are logged to the
 * console and swallowed: the database policy is the authority on whether an
 * event may be written.
 */
@Injectable({ providedIn: 'root' })
export class PrintAuditService {
  private readonly db = inject(DatabaseService);
  private readonly auth = inject(AuthService);

  async record(event: PrintAuditEvent): Promise<void> {
    try {
      const actorId = this.auth.session()?.user.id ?? null;
      const actorRole = this.auth.role();
      const row = {
        actor_id: actorId,
        actor_role: actorRole,
        action: event.action,
        document_kind: event.documentKind.slice(0, 80),
        document_reference: event.reference.slice(0, 200),
        format: event.format,
        metadata: event.metadata ?? {},
      };
      const { error } = await this.db.client.from('print_audit_events').insert(row);
      if (error) {
        console.warn('print audit event not recorded', { code: error.code });
      }
    } catch (error) {
      console.warn('print audit event not recorded', error);
    }
  }

  /** Fire-and-forget helper for callers that cannot wait for the round trip. */
  recordInBackground(event: PrintAuditEvent): void {
    void this.record(event);
  }
}
