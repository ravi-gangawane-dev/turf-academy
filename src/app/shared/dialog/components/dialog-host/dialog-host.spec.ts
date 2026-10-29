import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DialogHost } from './dialog-host';
import { DialogService } from '../../dialog.service';
import { DialogType } from '../../models/dialog-config.model';

describe('DialogHost', () => {
  let fixture: ComponentFixture<DialogHost>;
  let service: DialogService;
  let element: HTMLElement;

  const primaryButton = () => element.querySelector<HTMLButtonElement>('button.dialog-button.primary')!;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DialogHost] }).compileComponents();
    fixture = TestBed.createComponent(DialogHost);
    service = TestBed.inject(DialogService);
    element = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => service.closeAll());

  it('renders nothing while no dialog is open', () => {
    expect(element.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders the active configuration and resolves on the primary action', async () => {
    const result = service.open({
      type: DialogType.CONFIRM,
      title: 'Remove batch allocation?',
      message: 'The coach will be removed from this batch.',
      confirmLabel: 'Remove',
    });
    fixture.detectChanges();

    const dialog = element.querySelector('[role="dialog"]')!;
    expect(dialog).not.toBeNull();
    expect(dialog.querySelector('#dialog-title')?.textContent).toContain('Remove batch allocation?');
    expect(dialog.textContent).toContain('The coach will be removed from this batch.');
    expect(primaryButton().textContent).toContain('Remove');

    primaryButton().click();
    await fixture.whenStable();
    fixture.detectChanges();

    await expect(result).resolves.toMatchObject({ confirmed: true, action: 'confirm' });
    expect(element.querySelector('[role="dialog"]')).toBeNull();
  });

  it('does not render a cancel action for message dialogs', () => {
    void service.open({ type: DialogType.SUCCESS, title: 'Saved', message: 'All good.', showCancel: false });
    fixture.detectChanges();

    expect(primaryButton()).not.toBeNull();
    expect(element.querySelector('button.dialog-button.secondary')).toBeNull();
    expect(element.querySelector('.message-icon')).not.toBeNull();
  });

  it('marks destructive dialogs with the danger action', () => {
    void service.open({ type: DialogType.DELETE, title: 'Delete student?', message: 'Permanent.' });
    fixture.detectChanges();

    expect(primaryButton().classList).toContain('danger');
  });

  it('renders form fields and blocks submit until required fields are valid', async () => {
    const result = service.open({
      type: DialogType.FORM,
      title: 'Add student',
      fields: [
        { id: 'name', label: 'Full name', type: 'text', required: true },
        { id: 'batch', label: 'Batch', type: 'select', options: [{ label: 'Under 12', value: 'u12' }] },
      ],
    });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const input = element.querySelector<HTMLInputElement>('#dialog-field-name')!;
    expect(input).not.toBeNull();
    expect(element.querySelector<HTMLSelectElement>('#dialog-field-batch')).not.toBeNull();
    expect(primaryButton().disabled).toBe(true);

    input.value = 'Aarav Sharma';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(primaryButton().disabled).toBe(false);

    primaryButton().click();
    fixture.detectChanges();

    await expect(result).resolves.toMatchObject({
      confirmed: true,
      action: 'submit',
      value: { name: 'Aarav Sharma', batch: 'u12' },
    });
  });

  it('shows a busy spinner and blocks dismissal while busy', async () => {
    let finish: () => void = () => {};
    const result = service.open({
      type: DialogType.FORM,
      title: 'Save student',
      fields: [{ id: 'name', label: 'Name', type: 'text' }],
      actions: [
        {
          name: 'submit',
          label: 'Save',
          action: () => new Promise<void>((resolve) => (finish = resolve)),
        },
      ],
    });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    primaryButton().click();
    fixture.detectChanges();

    expect(primaryButton().disabled).toBe(true);
    expect(primaryButton().querySelector('.spinner')).not.toBeNull();
    expect(element.querySelector<HTMLButtonElement>('button.dialog-close')?.disabled).toBe(true);

    finish();
    await fixture.whenStable();

    await expect(result).resolves.toMatchObject({ action: 'submit' });
  });

  it('shows the preview badge for playground dialogs', () => {
    void service.open({ type: DialogType.CONFIRM, title: 'Preview', message: 'Body', preview: true });
    fixture.detectChanges();

    expect(element.querySelector('.preview-badge')?.textContent).toContain('Preview mode');
  });

  it('cancels on Escape and returns focus behaviour to the page', async () => {
    const result = service.open({ type: DialogType.CONFIRM, title: 'Escape me', message: 'Body' });
    fixture.detectChanges();
    await fixture.whenStable();

    element
      .querySelector('[role="dialog"]')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    await expect(result).resolves.toMatchObject({ confirmed: false, action: 'cancel' });
  });
});
