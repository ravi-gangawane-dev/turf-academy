/** Keep a request key through uncertain responses; retire it only after success. */
export class MutationAttempt {
  private fingerprint = '';
  private reference = '';
  key(value: unknown): string {
    const fingerprint = JSON.stringify(value);
    if (fingerprint !== this.fingerprint || !this.reference) {
      this.fingerprint = fingerprint;
      this.reference = crypto.randomUUID();
    }
    return this.reference;
  }
  complete(): void { this.fingerprint = ''; this.reference = ''; }
}
