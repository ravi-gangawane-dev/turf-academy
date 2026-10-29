import { ReportDataset, ReportType } from '../../core/models/academy.model';

export function reportToCsv(report: ReportDataset): string {
  const safeCell=(value:string|number)=>{let text=String(value??'');if(/^[=+\-@]/.test(text))text=`'${text}`;return `"${text.replaceAll('"','""')}"`;};
  return [report.columns.map(column=>safeCell(column.label)).join(','),...report.rows.map(row=>report.columns.map(column=>safeCell(row[column.key]??'')).join(','))].join('\r\n');
}

export const reportTypes:readonly ReportType[]=['attendance','fees','pending','enrollment','revenue'];
