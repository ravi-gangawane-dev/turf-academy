import {
  KNOWN_TEMPLATE_PLACEHOLDERS,
  SUPPORTED_TEMPLATE_CHANNELS,
  TEMPLATE_PLACEHOLDER_CONTRACTS,
  isSupportedTemplateChannel,
  validateNotificationTemplate,
} from './notification-template-contract';

function sample(keys: readonly string[]): string {
  return keys.map((key) => `{${key}}`).join(' ');
}

describe('notification template contracts', () => {
  it('accepts every placeholder that the automation contract supplies', () => {
    for (const [templateKey, placeholders] of Object.entries(
      TEMPLATE_PLACEHOLDER_CONTRACTS,
    )) {
      expect(
        validateNotificationTemplate({
          templateKey,
          channel: 'in_app',
          subject: sample(placeholders),
          body: sample(placeholders),
        }),
        templateKey,
      ).toEqual([]);
    }
  });

  it('rejects a placeholder that the event does not supply and names the allowed set', () => {
    const issues = validateNotificationTemplate({
      templateKey: 'attendance_check_in',
      channel: 'in_app',
      subject: 'Checked in',
      body: '{student_name} checked in at {event_time}. Fee: {amount}.',
    });

    expect(issues).toHaveLength(1);
    expect(issues[0].field).toBe('body');
    expect(issues[0].placeholder).toBe('amount');
    expect(issues[0].message).toContain('not part of the attendance_check_in contract');
    expect(issues[0].message).toContain('{event_time}');
  });

  it('lets a custom template use documented placeholders but catches typos', () => {
    const api = () => ({
      channel: 'email',
      subject: 'Custom notice',
      body: 'Hello {student_name}',
    });

    expect(
      validateNotificationTemplate({ ...api(), templateKey: 'custom_reminder' }),
    ).toEqual([]);
    expect(
      validateNotificationTemplate({
        ...api(),
        templateKey: 'custom_reminder',
        body: 'Hello {studnt_name}',
      }),
    ).toEqual([
      expect.objectContaining({
        field: 'body',
        placeholder: 'studnt_name',
        message: expect.stringContaining('Unknown placeholder'),
      }),
    ]);
  });

  it('rejects uppercase, spaced, and unbalanced placeholders', () => {
    const issues = validateNotificationTemplate({
      templateKey: 'fee_due_today',
      channel: 'in_app',
      subject: 'Fee for {Student_Name}',
      body: 'Amount {amount',
    });

    expect(issues.map((issue) => issue.field)).toEqual(['subject', 'body']);
    expect(issues[0].message).toContain('lowercase letters');
    expect(issues[1].message).toContain('Unbalanced placeholder braces');
  });

  it('accepts surrounding whitespace inside a documented placeholder', () => {
    expect(
      validateNotificationTemplate({
        templateKey: 'fee_due_today',
        channel: 'whatsapp',
        subject: '',
        body: 'Hello { parent_name }',
      }),
    ).toEqual([]);
  });

  it('enforces the supported channel policy and exposes the documented list', () => {
    expect(SUPPORTED_TEMPLATE_CHANNELS).toEqual(['in_app', 'email', 'whatsapp']);
    expect(isSupportedTemplateChannel('whatsapp')).toBe(true);
    expect(isSupportedTemplateChannel('sms')).toBe(false);
    expect(
      validateNotificationTemplate({
        templateKey: 'student_birthday',
        channel: 'sms',
        subject: '{student_name}',
        body: '{student_name}',
      }),
    ).toEqual([
      expect.objectContaining({
        field: 'channel',
        message: expect.stringContaining('not supported'),
      }),
    ]);
  });

  it('publishes a stable set of documented placeholders', () => {
    expect(KNOWN_TEMPLATE_PLACEHOLDERS).toEqual(
      expect.arrayContaining([
        'amount',
        'batch_name',
        'coach_name',
        'due_date',
        'event_time',
        'parent_name',
        'student_name',
      ]),
    );
    expect(KNOWN_TEMPLATE_PLACEHOLDERS).not.toContain('student');
  });
});
