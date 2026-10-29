import { dataErrorMessage, DataRequestError } from './data-error';

describe('dataErrorMessage', () => {
  it('explains a duplicate record without leaking database detail', () => {
    expect(dataErrorMessage({ code: '23505' })).toBe(
      'This record already exists. Check the details and try again.',
    );
  });

  it('explains a broken link to other records', () => {
    expect(dataErrorMessage({ code: '23503' })).toBe(
      'This record is linked to other records. Review those links before making this change.',
    );
  });

  it('asks for missing or invalid details', () => {
    for (const code of ['23514', '23502', '22P02']) {
      expect(dataErrorMessage({ code })).toBe(
        'Some details are missing or invalid. Check the form and try again.',
      );
    }
  });

  it('points at the administrator when a table or view is missing', () => {
    for (const code of ['42P01', 'PGRST205']) {
      expect(dataErrorMessage({ code })).toContain('latest database migration');
    }
  });

  it('reports missing permission and expired sessions distinctly', () => {
    expect(dataErrorMessage({ code: '42501' })).toContain('permission');
    expect(dataErrorMessage({ status: 403 })).toContain('permission');
    expect(dataErrorMessage({ code: 'PGRST301' })).toContain('sign in again');
    expect(dataErrorMessage({ status: 401 })).toContain('sign in again');
  });

  it('detects connectivity failures from the error message', () => {
    expect(dataErrorMessage({ message: 'TypeError: Failed to fetch' })).toContain(
      'Unable to connect',
    );
    expect(dataErrorMessage({ message: 'network timeout' })).toContain('Unable to connect');
  });

  it('falls back to a generic message and never leaks SQL or table names', () => {
    const message = dataErrorMessage({ code: 'XX000', message: 'select * from students failed' });
    expect(message).toBe(
      'This request could not be completed. Please try again. If the problem continues, contact the academy administrator.',
    );
    expect(message).not.toContain('select');
    expect(message).not.toContain('students');
  });

  it('handles values that are not database errors at all', () => {
    expect(dataErrorMessage(null)).toContain('could not be completed');
    expect(dataErrorMessage(undefined)).toContain('could not be completed');
    expect(dataErrorMessage('boom')).toContain('could not be completed');
  });
});

describe('DataRequestError', () => {
  it('keeps the operation and the original cause while showing a public message', () => {
    const cause = { code: '23505', message: 'duplicate key value violates unique constraint' };
    const error = new DataRequestError('Save student', cause);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('DataRequestError');
    expect(error.operation).toBe('Save student');
    expect(error.cause).toBe(cause);
    expect(error.message).toBe('This record already exists. Check the details and try again.');
  });
});
