import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RoleRedirectPage } from './role-redirect-page';

describe('RoleRedirectPage', () => {
  let component: RoleRedirectPage;
  let fixture: ComponentFixture<RoleRedirectPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoleRedirectPage],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(RoleRedirectPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});