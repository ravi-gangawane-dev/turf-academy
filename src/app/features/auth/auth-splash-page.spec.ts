import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthSplashPage } from './auth-splash-page';

describe('AuthSplashPage', () => {
  let component: AuthSplashPage;
  let fixture: ComponentFixture<AuthSplashPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthSplashPage]
    }).compileComponents();

    fixture = TestBed.createComponent(AuthSplashPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});