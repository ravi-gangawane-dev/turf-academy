import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { OfflineQueuePage } from './offline-queue-page';

describe('OfflineQueuePage', () => {
  let component: OfflineQueuePage;
  let fixture: ComponentFixture<OfflineQueuePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfflineQueuePage],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(OfflineQueuePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});