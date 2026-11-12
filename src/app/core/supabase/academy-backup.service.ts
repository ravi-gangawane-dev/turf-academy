import { inject, Injectable } from '@angular/core';
import { DatabaseService } from '../../core/supabase/database.service';
import { downloadJson } from '../../shared/export/export-file';

/**
 * One authoritative list for the JSON academy backup. Both settings entry
 * points use this service so they can never drift apart.
 */
export const ACADEMY_BACKUP_TABLES = [
  'academy_settings',
  'profiles',
  'students',
  'parents',
  'student_parents',
  'coaches',
  'coach_specializations',
  'fee_plans',
  'batches',
  'batch_days',
  'batch_coaches',
  'batch_waitlist',
  'enrollments',
  'enrollment_history',
  'attendance_records',
  'attendance_corrections',
  'monthly_charges',
  'payments',
  'payment_refunds',
  'receipts',
  'discounts',
  'student_discounts',
  'late_fee_rules',
  'notifications',
  'notification_templates',
  'student_documents',
  'student_medical_records',
  'vaccinations',
] as const;

export type AcademyBackupTable = (typeof ACADEMY_BACKUP_TABLES)[number];

const PAGE_SIZE = 500;

/** Personal profile fields must never be exported through a `select *` query. */
const SAFE_COLUMNS: Partial<Record<AcademyBackupTable, string>> = {
  profiles: 'id,full_name,email,phone,role,status,is_active,created_at',
  notifications:
    'id,student_id,parent_id,channel,template_key,recipient,subject,body,status,scheduled_at,sent_at,created_at',
};

/** Tables without an `id` column need a stable composite ordering for paging. */
const COMPOSITE_ORDER: Partial<Record<AcademyBackupTable, readonly string[]>> = {
  coach_specializations: ['coach_id', 'specialization'],
  batch_days: ['batch_id', 'day_of_week'],
  batch_coaches: ['batch_id', 'coach_id'],
  student_parents: ['student_id', 'parent_id'],
};

export interface AcademyBackup {
  readonly format: 'turf-academy-records-v1';
  readonly exportedAt: string;
  readonly records: Readonly<Record<string, readonly unknown[]>>;
}

/**
 * Reads every academy table the JSON backup promises. Browsers cannot read
 * storage objects or auth users, so the file stays a records export and the UI
 * tells the user to use the provider backup for a full restore.
 */
@Injectable({ providedIn: 'root' })
export class AcademyBackupService {
  private readonly db = inject(DatabaseService);

  async readRecords(
    onProgress?: (table: AcademyBackupTable) => void,
  ): Promise<Record<string, readonly unknown[]>> {
    const records: Record<string, readonly unknown[]> = {};
    for (const table of ACADEMY_BACKUP_TABLES) {
      onProgress?.(table);
      const rows: unknown[] = [];
      for (let offset = 0; ; offset += PAGE_SIZE) {
        let query = this.db.client
          .from(table)
          .select(SAFE_COLUMNS[table] ?? '*')
          .range(offset, offset + PAGE_SIZE - 1);
        const order = COMPOSITE_ORDER[table];
        if (order) {
          for (const column of order) query = query.order(column);
        } else {
          query = query.order('id');
        }
        const result = await query;
        if (result.error) {
          throw new Error('The export could not be completed. Please try again.');
        }
        if (!result.data) throw new Error(`Could not export ${table}: no data returned.`);
        rows.push(...result.data);
        if (result.data.length < PAGE_SIZE) break;
      }
      records[table] = rows;
    }
    return records;
  }

  async createBackup(exportedAt = new Date()): Promise<AcademyBackup> {
    return {
      format: 'turf-academy-records-v1',
      exportedAt: exportedAt.toISOString(),
      records: await this.readRecords(),
    };
  }

  /** Reads and downloads the whole backup. Returns the row count for messaging. */
  async download(
    onProgress?: (table: AcademyBackupTable) => void,
    now = new Date(),
  ): Promise<number> {
    const records = await this.readRecords(onProgress);
    const backup: AcademyBackup = {
      format: 'turf-academy-records-v1',
      exportedAt: now.toISOString(),
      records,
    };
    downloadJson(`academy-records-${now.toISOString().slice(0, 10)}.json`, backup);
    return Object.values(records).reduce((total, rows) => total + rows.length, 0);
  }
}
