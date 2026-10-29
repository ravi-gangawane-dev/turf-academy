import { Injectable } from '@angular/core';

export interface AttendanceWhatsApp {
  readonly parentName?: string;
  readonly studentName: string;
  readonly batchName: string;
  readonly parentPhone: string;
  readonly action: 'check_in' | 'check_out';
  /** Timestamp saved by the database for the check-in or check-out. */
  readonly timestamp: string;
  readonly academyName?: string;
  readonly timezone?: string;
}

/**
 * Free WhatsApp "click to chat" integration.
 *
 * Builds a wa.me link with the attendance message already filled in. WhatsApp opens with
 * the parent's number and text prepared, but a person still has to press Send, so this
 * must never be treated as a delivered notification.
 */
@Injectable({ providedIn: 'root' })
export class WhatsappService {
  createMessage(data: AttendanceWhatsApp): string {
    const academy = (data.academyName ?? 'Turf Cricket Academy').trim();
    const date = new Date(data.timestamp);
    if (Number.isNaN(date.getTime())) throw new Error('Attendance time is not valid.');
    const timeZone = data.timezone ?? 'Asia/Kolkata';
    const dateText = new Intl.DateTimeFormat('en-IN', { timeZone, dateStyle: 'medium' }).format(date);
    const timeText = new Intl.DateTimeFormat('en-IN', { timeZone, timeStyle: 'short' }).format(date);
    const actionText = data.action === 'check_in' ? 'checked in at' : 'checked out from';
    return [
      data.parentName ? `Hello ${data.parentName.trim()},` : 'Dear Parent,',
      '',
      `Your child ${data.studentName.trim()} has successfully ${actionText} ${academy}.`,
      '',
      `Date: ${dateText}`,
      `${data.action === 'check_in' ? 'Check-in' : 'Check-out'} Time: ${timeText}`,
      '',
      `\u2014 ${academy}`,
    ].join('\n');
  }

  /** Digits-only international number for wa.me (no plus sign). */
  normalizeRecipient(rawPhone: string): string {
    const raw = String(rawPhone ?? '').trim();
    if (!raw) throw new Error('No parent WhatsApp number is linked to this student.');
    if (!/^\+?[\d\s().-]+$/.test(raw)) throw new Error('Parent phone number is not a valid international number.');
    const digits = raw.replace(/\D/g, '');
    if (!digits) throw new Error('No parent WhatsApp number is linked to this student.');
    // An explicit country code is authoritative: +91 98765 43210, +1 415 555 2671.
    if (raw.startsWith('+')) return this.accept(digits);
    if (digits.length === 10) return this.accept(`91${digits}`);
    if (digits.length === 11 && digits.startsWith('0')) return this.accept(`91${digits.slice(1)}`);
    return this.accept(digits);
  }

  createLink(data: AttendanceWhatsApp): string {
    const phone = this.normalizeRecipient(data.parentPhone);
    return `https://wa.me/${phone}?text=${encodeURIComponent(this.createMessage(data))}`;
  }

  linkForMessage(rawPhone: string, message: string): string {
    const phone = this.normalizeRecipient(rawPhone);
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }

  openWhatsApp(data: AttendanceWhatsApp): void {
    const url = this.createLink(data);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  private accept(digits: string): string {
    if (!/^[1-9]\d{7,14}$/.test(digits) || (digits.startsWith('91') && !/^91[6-9]\d{9}$/.test(digits))) throw new Error('Parent phone number is not a valid international number.');
    return digits;
  }
}
