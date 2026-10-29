import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WhatsappAction } from './whatsapp-action';

describe('WhatsappAction', () => {
  let component: WhatsappAction;
  let fixture: ComponentFixture<WhatsappAction>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WhatsappAction]
    }).compileComponents();

    fixture = TestBed.createComponent(WhatsappAction);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});