import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { AttendanceViewNavigation } from './attendance-view-navigation';

describe('AttendanceViewNavigation', () => {
  let fixture: ComponentFixture<AttendanceViewNavigation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AttendanceViewNavigation],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { hasPermission: () => true } },
      ],
    }).compileComponents();
  });

  it('shows Attendance Summary as a coach attendance tab', () => {
    fixture = TestBed.createComponent(AttendanceViewNavigation);
    fixture.componentRef.setInput('coachMode', true);
    fixture.detectChanges();

    const summaryLink = fixture.nativeElement.querySelector(
      'a[href="/coach/attendance/summary"]',
    ) as HTMLAnchorElement | null;
    expect(summaryLink?.textContent).toContain('Attendance Summary');
  });

  it('keeps the admin attendance tabs unchanged', () => {
    fixture = TestBed.createComponent(AttendanceViewNavigation);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Dashboard');
    expect(fixture.nativeElement.textContent).not.toContain('Attendance Summary');
  });
});
