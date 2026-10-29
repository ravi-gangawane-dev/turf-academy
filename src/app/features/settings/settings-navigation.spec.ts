import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SettingsNavigation } from './settings-navigation';

describe('SettingsNavigation', () => {
  let component: SettingsNavigation;
  let fixture: ComponentFixture<SettingsNavigation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsNavigation],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsNavigation);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});