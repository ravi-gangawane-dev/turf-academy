export class VerificationBlocked extends Error {}

export function verifyOwnership(rows, owner, role) {
  if (!owner) throw new VerificationBlocked(`Test ${role} account has no visible linked ${role} record`);
  if (!Array.isArray(rows)) throw new Error('Notification response is not a row array');
  if (!rows.length) throw new VerificationBlocked('No visible notification fixtures; ownership cannot be established from an empty inbox');
  if (!rows.every(row => row[`${role}_id`] === owner.id)) throw new Error('Cross-recipient rows exposed');
}
