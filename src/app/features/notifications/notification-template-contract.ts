/**
 * Event contracts for notification templates.
 *
 * The automation functions in Supabase render a fixed set of placeholders for each
 * event. Rejecting a placeholder that the event never supplies avoids saving a
 * template that would reach a parent or coach with `{missing_value}` in it.
 *
 * Keep these keys and placeholders in step with
 * `supabase/migrations/202610130002_academy_notification_automations.sql` and the
 * birthday email/WhatsApp templates.
 */
export const SUPPORTED_TEMPLATE_CHANNELS = ['in_app', 'email', 'whatsapp'] as const;
export type SupportedTemplateChannel = (typeof SUPPORTED_TEMPLATE_CHANNELS)[number];

export const TEMPLATE_PLACEHOLDER_CONTRACTS: Readonly<Record<string, readonly string[]>> = {
  fee_due_today: ['parent_name', 'student_name', 'amount', 'batch_name', 'due_date'],
  student_birthday: ['parent_name', 'student_name'],
  student_birthday_email: ['parent_name', 'student_name'],
  student_birthday_whatsapp: ['parent_name', 'student_name'],
  coach_birthday: ['coach_name'],
  coach_birthday_email: ['coach_name'],
  coach_birthday_whatsapp: ['coach_name'],
  attendance_check_in: ['parent_name', 'student_name', 'batch_name', 'event_time', 'session_date'],
  attendance_check_out: ['parent_name', 'student_name', 'batch_name', 'event_time', 'session_date'],
  attendance_absent: ['parent_name', 'student_name', 'batch_name', 'session_date'],
  attendance_missed_three_days: ['parent_name', 'student_name', 'from_date', 'to_date'],
  academy_holiday: ['parent_name', 'event_name', 'event_date', 'event_details'],
  academy_special_event: ['parent_name', 'event_name', 'event_date', 'event_details'],
};

/** Placeholders documented for custom templates that do not have an event contract yet. */
export const KNOWN_TEMPLATE_PLACEHOLDERS: readonly string[] = [
  ...new Set(Object.values(TEMPLATE_PLACEHOLDER_CONTRACTS).flat()),
].sort();

export type TemplateContractField = 'channel' | 'subject' | 'body';

export interface TemplateContractIssue {
  readonly field: TemplateContractField;
  readonly placeholder?: string;
  readonly message: string;
}

export function isSupportedTemplateChannel(
  channel: string,
): channel is SupportedTemplateChannel {
  return (SUPPORTED_TEMPLATE_CHANNELS as readonly string[]).includes(channel);
}

/**
 * Validates a template against its event contract and the supported channel policy.
 * The first issue is suitable for display; every issue is returned for diagnostics.
 */
export function validateNotificationTemplate(input: {
  readonly templateKey: string;
  readonly channel: string;
  readonly subject: string;
  readonly body: string;
}): readonly TemplateContractIssue[] {
  const issues: TemplateContractIssue[] = [];
  if (!isSupportedTemplateChannel(input.channel)) {
    issues.push({
      field: 'channel',
      message: `The ${input.channel || 'selected'} channel is not supported. Use in-app, email, or WhatsApp.`,
    });
  }

  const templateKey = input.templateKey.trim();
  const contract = TEMPLATE_PLACEHOLDER_CONTRACTS[templateKey];
  const allowed = new Set(contract ?? KNOWN_TEMPLATE_PLACEHOLDERS);
  const contractHint = contract
    ? `Allowed placeholders for ${templateKey}: ${contract.map((key) => `{${key}}`).join(', ')}.`
    : 'Use a documented notification placeholder or remove it.';

  for (const field of ['subject', 'body'] as const) {
    const value = input[field];
    for (const match of value.matchAll(/\{([^{}]*)\}/g)) {
      const placeholder = match[1].trim();
      if (!/^[a-z0-9_]+$/.test(placeholder)) {
        issues.push({
          field,
          placeholder,
          message: `Placeholder {${placeholder}} is invalid. Use lowercase letters, numbers, and underscores.`,
        });
        continue;
      }
      if (!allowed.has(placeholder)) {
        issues.push({
          field,
          placeholder,
          message: contract
            ? `Placeholder {${placeholder}} is not part of the ${templateKey} contract. ${contractHint}`
            : `Unknown placeholder {${placeholder}}. ${contractHint}`,
        });
      }
    }
    if (/[{}]/.test(value.replace(/\{[^{}]*\}/g, ''))) {
      issues.push({
        field,
        message: `Unbalanced placeholder braces in the ${field}. Use the form {lower_case_name}.`,
      });
    }
  }

  return issues;
}
