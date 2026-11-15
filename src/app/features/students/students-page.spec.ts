import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PrintDocumentService } from '../../shared/print/print-document.service';
import { StudentListItem } from './student-list.service';
import { StudentsPage } from './students-page';

const student: StudentListItem = {
  id: 's1',
  studentCode: 'TCA-1001',
  fullName: 'Aarav Sharma',
  photoUrl: null,
  batchId: 'b1',
  batchName: 'Junior Squad',
  programId: null,
  programName: null,
  coachId: null,
  coachName: null,
  coachPhotoUrl: null,
  dateOfBirth: '2012-04-18',
  phone: '9876543210',
  status: 'active',
  parentName: 'Rohit Sharma',
  parentPhone: '9876500000',
  joinDate: '2025-06-01',
  address: { line1: '', city: '', state: '', pinCode: '' },
};

describe('StudentsPage', () => {
  let component: StudentsPage;
  let fixture: ComponentFixture<StudentsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentsPage],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(StudentsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('prints ID cards for the ticked students as one batch', async () => {
    const printDocuments = TestBed.inject(PrintDocumentService);
    const printIdCards = vi.spyOn(printDocuments, 'printIdCards').mockResolvedValue(undefined);
    const second: StudentListItem = {
      ...student,
      id: 's2',
      studentCode: 'TCA-1002',
      fullName: 'Diya Sharma',
    };
    component['rows'].set([student, second]);

    component['toggleSelected']('s1');
    component['toggleSelected']('s2');
    expect(component['selectedCount']()).toBe(2);
    expect(component['allOnPageSelected']()).toBe(true);

    await component['printSelectedCards']();

    expect(printIdCards).toHaveBeenCalledOnce();
    const [cards, destination] = printIdCards.mock.calls[0];
    expect(destination).toBe('preview');
    expect(cards.map((card) => card.fullName)).toEqual(['Aarav Sharma', 'Diya Sharma']);
    expect(cards[0].cardNumber).toBe('ID-STU-TCA1001');
    expect(cards[0].holderType).toBe('student');
    expect(cards[0].holderCode).toBe('TCA-1001');
  });
});
