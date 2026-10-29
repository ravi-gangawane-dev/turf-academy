import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CoachPortalPage } from './coach-portal-page';

describe('CoachPortalPage', () => {
  let component: CoachPortalPage;
  let fixture: ComponentFixture<CoachPortalPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoachPortalPage],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(CoachPortalPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});