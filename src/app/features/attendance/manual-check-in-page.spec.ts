import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ManualCheckInPage } from './manual-check-in-page';

describe('ManualCheckInPage', () => {
  let component: ManualCheckInPage;
  let fixture: ComponentFixture<ManualCheckInPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManualCheckInPage],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ManualCheckInPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});