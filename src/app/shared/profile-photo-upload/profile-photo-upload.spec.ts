import { TestBed } from '@angular/core/testing';
import { ProfilePhotoUpload } from './profile-photo-upload';

describe('ProfilePhotoUpload save lifecycle', () => {
  afterEach(() => { TestBed.resetTestingModule(); vi.restoreAllMocks(); });
  function setup() {
    const fixture = TestBed.createComponent(ProfilePhotoUpload);
    const page = fixture.componentInstance;
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.photo-trigger').focus();
    fixture.nativeElement.querySelector('.photo-trigger').click();
    page.edited = true;
    page.previewUrl.set('data:image/jpeg;base64,draft');
    vi.spyOn(page as any, 'render').mockResolvedValue({
      toBlob: (callback: BlobCallback) => callback(new Blob(['photo'], { type: 'image/jpeg' })),
    });
    fixture.detectChanges();
    return { fixture, page };
  }

  it('keeps the editor open and blocks duplicate save and dismissal until persistence succeeds', async () => {
    const { fixture, page } = setup();
    let finish!: (value: boolean) => void;
    page.saveAction = vi.fn(() => new Promise<boolean>(resolve => finish = resolve));
    const selected = vi.spyOn(page.fileSelected, 'emit');
    const saving = page.saveAndClose();
    await vi.waitFor(() => expect(page.saveAction).toHaveBeenCalledOnce());
    expect(page.open).toBe(true);
    page.close();
    await page.saveAndClose();
    expect(page.open).toBe(true);
    expect(selected).toHaveBeenCalledOnce();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.cancel').disabled).toBe(true);
    finish(true);
    await saving;
    expect(page.open).toBe(false);
    expect(page.processing()).toBe(false);
  });

  it('preserves the edited preview after a rejected write and permits retry', async () => {
    const { page } = setup();
    page.saveAction = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await page.saveAndClose();
    expect(page.open).toBe(true);
    expect(page.previewUrl()).toBe('data:image/jpeg;base64,draft');
    expect(page.error()).toContain('not saved');
    await page.saveAndClose();
    expect(page.open).toBe(false);
    expect(page.error()).toBe('');
  });

  it('preserves edits when persistence throws', async () => {
    const { page } = setup();
    page.saveAction = async () => { throw new Error('network'); };
    await page.saveAndClose();
    expect(page.open).toBe(true);
    expect(page.error()).toContain('try again');
    expect(page.processing()).toBe(false);
  });

  it('stages a new-record photo without calling persistence', async () => {
    const { page } = setup();
    const selected = vi.spyOn(page.fileSelected, 'emit');
    await page.saveAndClose();
    expect(selected).toHaveBeenCalledOnce();
    expect(page.open).toBe(false);
  });

  it('locks background scrolling, blocks Escape while busy and restores focus on dismissal', async () => {
    const { fixture, page } = setup();
    expect(document.body.style.overflow).toBe('hidden');
    page.processing.set(true);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('[role="dialog"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(page.open).toBe(true);
    page.processing.set(false);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('[role="dialog"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(page.open).toBe(false);
    expect(document.body.style.overflow).not.toBe('hidden');
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('.photo-trigger'));
  });
});
