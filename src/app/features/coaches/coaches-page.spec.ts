import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CoachesPage } from './coaches-page';

describe('CoachesPage', () => {
  let component: CoachesPage;
  let fixture: ComponentFixture<CoachesPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoachesPage],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(CoachesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
