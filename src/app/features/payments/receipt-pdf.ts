export interface ReceiptPdfData {
  readonly currencyCode?: string;
  readonly academyName?: string;
  readonly timezone?: string;
  readonly receiptNumber: string;
  readonly studentName: string;
  readonly studentCode: string;
  readonly amountPaise: number;
  readonly paymentMode: string;
  readonly paidAt: string;
}

const escapePdf = (value: string) => value.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');

export function createReceiptPdf(data: ReceiptPdfData): Blob {
  const amount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: data.currencyCode ?? 'INR', currencyDisplay:'code' }).format(data.amountPaise / 100).replace(/\s/g, ' ');
  const lines = [data.academyName ?? 'Turf Cricket Academy', `Receipt: ${data.receiptNumber}`, `Student: ${data.studentName}`, `Student ID: ${data.studentCode || '-'}`, `Amount: ${amount}`, `Payment mode: ${data.paymentMode}`, `Paid at: ${new Date(data.paidAt).toLocaleString('en-IN',{timeZone:data.timezone??'Asia/Kolkata'})}`];
  const content = lines.map((line, index) => `BT /F1 ${index === 0 ? 18 : 11} Tf 60 ${760-index*38} Td (${escapePdf(line)}) Tj ET`).join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n'; const offsets:number[]=[];
  objects.forEach((object,index)=>{offsets.push(pdf.length);pdf+=`${index+1} 0 obj\n${object}\nendobj\n`;});
  const xref=pdf.length;pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.map(offset=>`${String(offset).padStart(10,'0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf],{type:'application/pdf'});
}
