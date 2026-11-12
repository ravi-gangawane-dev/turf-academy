import { TestBed } from '@angular/core/testing';
import { PrintProfileSheetDocument } from '../print-document.models';
import { PrintProfileSheet } from './print-profile-sheet';

const brand = {
  name: 'Turf Cricket Academy',
  code: 'TCA',
  logoUrl: 'https://cdn.example/logo.png',
  address: 'Sector 21, Kharadi',
  phone: '+91 98765 43210',
  email: 'accounts@example.com',
  currencyCode: 'INR',
  timezone: 'Asia/Kolkata',
};

const studentSheet: PrintProfileSheetDocument = {
  kind: 'profile-sheet',
  brand,
  reference: 'PRF-STU-TCA1001',
  issuedAt: '2026-11-12T06:30:00Z',
  profileKind: 'student',
  fullName: 'Aarav Sharma',
  profileCode: 'TCA-1001',
  subtitle: 'Morning Elite · B-MOR',
  status: 'active',
  photoUrl: null,
  sections: [
    {
      title: 'Personal details',
      fields: [
        { label: 'Date of birth', value: '01 Feb 2014' },
        { label: 'Blood group', value: 'B+' },
      ],
    },
    {
      title: 'Enrollment',
      fields: [{ label: 'Batch', value: 'Morning Elite' }],
    },
  ],
  checklistTitle: 'Document checklist',
  checklist: [
    { label: 'Profile photograph', recorded: true, detail: 'Uploaded with the profile' },
    { label: 'Medical record', recorded: false },
    { label: 'Birth certificate', recorded: true, detail: '1 file · latest 02 Nov 2026' },
  ],
  documents: [
    {
      documentType: 'Birth certificate',
      fileName: 'aarav-birth.pdf',
      uploadedAt: '2026-11-02T09:00:00Z',
      uploadedBy: 'Front desk',
    },
  ],
};

const parentSheet: PrintProfileSheetDocument = {
  ...studentSheet,
  reference: 'PRF-PAR-P1',
  profileKind: 'parent',
  fullName: 'Ravi Patil',
  profileCode: 'p1',
  subtitle: 'Father',
  checklistTitle: 'Profile checklist',
  checklist: [{ label: 'Phone number', recorded: true, detail: '+91 98765 43211' }],
  documents: [],
};

describe('PrintProfileSheet', () => {
  const render = async (document: PrintProfileSheetDocument) => {
    await TestBed.configureTestingModule({ imports: [PrintProfileSheet] }).compileComponents();
    const fixture = TestBed.createComponent(PrintProfileSheet);
    fixture.componentRef.setInput('sheet', document);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  afterEach(() => TestBed.resetTestingModule());

  it('prints the student identity, live sections, checklist and uploaded documents', async () => {
    const element = await render(studentSheet);
    const text = element.textContent as string;

    expect(element.querySelector('.print-sheet--profile')).toBeTruthy();
    expect(text).toContain('Student Profile');
    expect(text).toContain('PRF-STU-TCA1001');
    expect(text).toContain('Aarav Sharma');
    expect(text).toContain('TCA-1001');
    expect(text).toContain('Morning Elite · B-MOR');
    expect(text).toContain('Personal details');
    expect(text).toContain('01 Feb 2014');
    expect(text).toContain('Document checklist');
    expect(text).toContain('2 of 3 recorded');
    expect(text).toContain('Medical record');
    expect(text).toContain('Not recorded');
    expect(text).toContain('Birth certificate');
    expect(text).toContain('aarav-birth.pdf');
    expect(text).toContain('02 Nov 2026');
    expect(text).toContain('Front desk');
  });

  it('uses the parent label and hides the upload table for profiles without documents', async () => {
    const element = await render(parentSheet);
    const text = element.textContent as string;

    expect(text).toContain('Parent Profile');
    expect(text).toContain('Parent ID');
    expect(text).toContain('Profile checklist');
    expect(element.querySelector('.profile-documents')).toBeNull();
    expect(text).not.toContain('Documents on file');
  });

  it('labels a coach code as an employee code', async () => {
    const element = await render({
      ...studentSheet,
      profileKind: 'coach',
      fullName: 'Coach Rao',
      profileCode: 'EMP-42',
    });

    expect(element.textContent).toContain('Coach Profile');
    expect(element.textContent).toContain('Employee code');
    expect(element.textContent).toContain('EMP-42');
  });

  it('states when the student has no uploaded documents', async () => {
    const element = await render({ ...studentSheet, documents: [], documentsNote: undefined });

    expect(element.textContent).toContain('No documents have been uploaded to this profile.');
  });
});
