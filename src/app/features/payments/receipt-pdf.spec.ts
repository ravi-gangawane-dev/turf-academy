import { describe, expect, it } from 'vitest';
import { createReceiptPdf } from './receipt-pdf';

describe('createReceiptPdf',()=>{
  it('creates a PDF containing escaped receipt values',async()=>{
    const blob=createReceiptPdf({receiptNumber:'RCP-(42)',studentName:'Aarav (Junior)',studentCode:'STU-1',amountPaise:125050,paymentMode:'upi',paidAt:'2026-09-16T10:00:00Z'});
    expect(blob.type).toBe('application/pdf');
    const text=await blob.text();
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text).toContain('RCP-\\(42\\)');
    expect(text).toContain('INR 1,250.50');
  });
});
