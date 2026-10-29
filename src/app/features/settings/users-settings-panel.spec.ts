import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { UsersSettingsPanel } from './users-settings-panel';

describe('UsersSettingsPanel', () => {
  let component: UsersSettingsPanel;
  let fixture: ComponentFixture<UsersSettingsPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsersSettingsPanel],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(UsersSettingsPanel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});