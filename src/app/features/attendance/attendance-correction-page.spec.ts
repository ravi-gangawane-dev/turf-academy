import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AttendanceCorrectionPage } from './attendance-correction-page';

describe('AttendanceCorrectionPage', () => {
  let component: AttendanceCorrectionPage;
  let fixture: ComponentFixture<AttendanceCorrectionPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AttendanceCorrectionPage],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AttendanceCorrectionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});