import { describe,expect,it } from 'vitest';
import { reportToCsv,reportTypes } from './report-csv';

describe('reportToCsv',()=>{
  for(const type of reportTypes)it(`exports safe ${type} CSV`,()=>{
    const csv=reportToCsv({type,title:type,generatedAt:'2026-09-16',columns:[{key:'name',label:'Name'}],rows:[{name:'=unsafe'}],summary:[]});
    expect(csv).toBe('"Name"\r\n"\'=unsafe"');
  });
});
