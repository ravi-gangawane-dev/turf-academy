/** Render browser fonts into a PDF so names in all supported scripts remain legible. */
export async function createDocumentPdf(lines: readonly string[]): Promise<Blob> {
  const canvas=document.createElement('canvas');canvas.width=1190;canvas.height=1684;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('PDF rendering is unavailable in this browser.');
  await document.fonts.ready;
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#173d2b';
  let y=100;
  for(let i=0;i<lines.length;i++){
    ctx.font=i===0?'bold 38px sans-serif':'24px sans-serif';
    let line='';
    for(const word of lines[i].split(' ')){
      const next=line?line+' '+word:word;
      if(ctx.measureText(next).width>1030&&line){ctx.fillText(line,80,y);y+=36;line=word;}else line=next;
    }
    ctx.fillText(line,80,y);y+=i===0?66:48;
    if(y>1600)throw new Error('This invoice is too long to fit on a single page.');
  }
  const jpeg=Uint8Array.from(atob(canvas.toDataURL('image/jpeg',0.94).split(',')[1]),c=>c.charCodeAt(0));
  const encoder=new TextEncoder();const chunks:Uint8Array[]=[];let size=0;const offsets=[0];
  const append=(value:string|Uint8Array)=>{const bytes=typeof value==='string'?encoder.encode(value):value;chunks.push(bytes);size+=bytes.byteLength;};
  append('%PDF-1.4\n');
  const object=(id:number,text:string)=>{offsets[id]=size;append(id+' 0 obj\n'+text+'\nendobj\n');};
  object(1,'<< /Type /Catalog /Pages 2 0 R >>');object(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  object(3,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Image 4 0 R >> >> /Contents 5 0 R >>');
  offsets[4]=size;append('4 0 obj\n<< /Type /XObject /Subtype /Image /Width 1190 /Height 1684 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpeg.length+' >>\nstream\n');append(jpeg);append('\nendstream\nendobj\n');
  const drawing='q 595 0 0 842 0 0 cm /Image Do Q';object(5,'<< /Length '+drawing.length+' >>\nstream\n'+drawing+'\nendstream');
  const xref=size;append('xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n ').join('\n')+'\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF');
  return new Blob(chunks as BlobPart[],{type:'application/pdf'});
}
export function downloadDocument(blob:Blob,name:string):void{const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
