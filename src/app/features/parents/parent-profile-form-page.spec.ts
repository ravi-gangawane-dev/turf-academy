import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ParentProfileFormPage } from './parent-profile-form-page';

describe('ParentProfileFormPage', () => {
  let component: ParentProfileFormPage;
  let fixture: ComponentFixture<ParentProfileFormPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParentProfileFormPage],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ParentProfileFormPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});