import { TestBed } from '@angular/core/testing';
import { DialogService } from './dialog.service';
import { DialogType } from './models/dialog-config.model';

describe('DialogService', () => {
  let service: DialogService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DialogService);
  });

  it('opens a dialog and resolves a confirmation result', async () => {
    const result = service.open({
      type: DialogType.CONFIRM,
      title: 'Delete student?',
      message: 'This removes the student.',
    });

    expect(service.isOpen()).toBe(true);
    expect(service.active()?.config.title).toBe('Delete student?');

    service.close('confirm');

    await expect(result).resolves.toMatchObject({
      confirmed: true,
      action: 'confirm',
      type: DialogType.CONFIRM,
    });
    expect(service.isOpen()).toBe(false);
  });

  it('resolves a cancelled dialog as not confirmed', async () => {
    const result = service.open({ type: DialogType.CONFIRM, title: 'Cancel me', message: 'Body' });
    service.close('cancel');

    await expect(result).resolves.toMatchObject({ confirmed: false, action: 'cancel' });
  });

  it('reuses an in-flight dialog with the same id instead of stacking duplicates', async () => {
    const first = service.open({
      id: 'student-delete',
      type: DialogType.DELETE,
      title: 'Delete',
      message: 'x',
    });
    const second = service.open({
      id: 'student-delete',
      type: DialogType.DELETE,
      title: 'Delete',
      message: 'x',
    });

    expect(first).toBe(second);
    expect(service.requests().length).toBe(1);

    service.close('cancel');
    await first;
  });

  it('stacks dialogs and resolves all of them on closeAll', async () => {
    const first = service.open({ type: DialogType.INFO, title: 'First', message: '1' });
    const second = service.open({ type: DialogType.INFO, title: 'Second', message: '2' });

    expect(service.requests().length).toBe(2);
    expect(service.active()?.config.title).toBe('Second');

    service.closeAll();

    await expect(first).resolves.toMatchObject({ confirmed: false, action: 'cancel' });
    await expect(second).resolves.toMatchObject({ confirmed: false, action: 'cancel' });
    expect(service.isOpen()).toBe(false);
  });

  it('applies default size and close behaviour from a minimal config', () => {
    void service.open({ type: DialogType.INFO, title: 'Info', message: 'Body' });

    expect(service.active()?.config.size).toBe('medium');
    expect(service.active()?.config.showClose).toBe(true);
  });

  it('never runs feature actions for preview dialogs', async () => {
    const action = vi.fn();
    const opened = service.open({
      type: DialogType.FORM,
      title: 'Edit student',
      preview: true,
      fields: [{ id: 'name', label: 'Name', type: 'text' }],
      actions: [{ name: 'submit', label: 'Save', action }],
    });

    await service.runAction(service.active()!, 'submit', { name: 'Aarav' });

    expect(action).not.toHaveBeenCalled();
    expect(service.active()?.busy).toBe(false);
    service.close('cancel');
    await opened;
  });

  it('runs feature actions for real dialogs and clears the busy state', async () => {
    const action = vi.fn().mockResolvedValue(undefined);
    const opened = service.open({
      type: DialogType.FORM,
      title: 'Edit student',
      actions: [{ name: 'submit', label: 'Save', action }],
    });

    await service.runAction(service.active()!, 'submit', { name: 'Aarav' });

    expect(action).toHaveBeenCalledWith({ name: 'Aarav' });
    expect(service.active()?.busy).toBe(false);
    service.close('cancel');
    await opened;
  });

  it('clears the busy state even when the feature action throws', async () => {
    const opened = service.open({
      type: DialogType.FORM,
      title: 'Edit student',
      actions: [{ name: 'submit', label: 'Save', action: () => Promise.reject(new Error('save failed')) }],
    });

    await expect(service.runAction(service.active()!, 'submit', {})).rejects.toThrow('save failed');
    expect(service.active()?.busy).toBe(false);
    service.close('cancel');
    await opened;
  });

  it('maps confirm() to a boolean result', async () => {
    const pending = service.confirm({ message: 'Remove allocation?', title: 'Batches' });
    service.close('confirm');

    await expect(pending).resolves.toBe(true);
  });

  it('returns the typed value from prompt() and null when cancelled', async () => {
    const answered = service.prompt({ message: 'Add a note', value: 'Existing' });
    expect(service.active()?.config.fields?.[0].defaultValue).toBe('Existing');
    service.close('confirm', 'Updated note');
    await expect(answered).resolves.toBe('Updated note');

    const cancelled = service.prompt({ message: 'Add a note' });
    service.close('cancel');
    await expect(cancelled).resolves.toBeNull();
  });

  it('keeps a form dialog marked for its owning modules', () => {
    void service.form({
      title: 'Add student',
      fields: [{ id: 'name', label: 'Name', type: 'text', required: true }],
      usedBy: ['Students'],
    });

    expect(service.active()?.config.usedBy).toEqual(['Students']);
    expect(service.active()?.config.type).toBe(DialogType.FORM);
  });
});
