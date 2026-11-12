/** Save an in-browser blob (CSV, JSON backup, image) under a user-facing name. */
export function downloadDocument(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.rel = 'noopener';
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
