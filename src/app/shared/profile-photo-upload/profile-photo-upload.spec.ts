import { TestBed } from '@angular/core/testing';
import { photoCoverScale, ProfilePhotoUpload } from './profile-photo-upload';

describe('ProfilePhotoUpload save lifecycle', () => {
  afterEach(() => { TestBed.resetTestingModule(); vi.restoreAllMocks(); });
  it('renders the reusable avatar trigger with initials and a camera action', () => {
    const fixture = TestBed.createComponent(ProfilePhotoUpload);
    fixture.componentRef.setInput('avatar', true);
    fixture.componentRef.setInput('initials', 'TU');
    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector('.avatar-trigger') as HTMLButtonElement;
    expect(trigger.getAttribute('aria-label')).toBe('Change profile photo');
    expect(trigger.querySelector('.avatar-initials')?.textContent?.trim()).toBe('TU');
    expect(trigger.querySelector('.camera-badge')).not.toBeNull();
  });

  it('reflects a selected photo in the trigger state', () => {
    const fixture = TestBed.createComponent(ProfilePhotoUpload);
    fixture.componentRef.setInput('selected', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.photo-trigger').textContent).toContain('Photo selected');
    expect(fixture.nativeElement.querySelector('.photo-trigger').classList).toContain('photo-selected');
  });

  it('allows switching between upload and camera source tabs', async () => {
    const fixture = TestBed.createComponent(ProfilePhotoUpload);
    const page = fixture.componentInstance;
    page.begin();
    fixture.detectChanges();

    const uploadTab = fixture.nativeElement.querySelector('[role="tab"][aria-selected="true"]');
    expect(uploadTab.textContent).toContain('Upload Photo');
    await page.selectMode('upload');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.drop-zone')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[role="tab"][aria-selected="true"]').textContent).toContain('Upload Photo');
  });

  it('requests a camera stream and stops it when switching back to upload', async () => {
    const original = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
    const track = { stop: vi.fn() };
    const stream = { getTracks: () => [track] } as unknown as MediaStream;
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    });
    try {
      const fixture = TestBed.createComponent(ProfilePhotoUpload);
      const page = fixture.componentInstance;
      page.begin();
      await page.selectMode('camera');
      expect(getUserMedia).toHaveBeenCalledWith({ audio: false, video: { facingMode: 'user' } });
      expect(page.cameraStream()).toBe(stream);
      await page.selectMode('upload');
      expect(track.stop).toHaveBeenCalledOnce();
      expect(page.cameraStream()).toBeNull();
    } finally {
      if (original) Object.defineProperty(navigator, 'mediaDevices', original);
      else Reflect.deleteProperty(navigator, 'mediaDevices');
    }
  });

  it('covers the square canvas when rotating non-square photos', () => {
    const scale = photoCoverScale(1600, 900, 45);
    const radians = Math.PI / 4;
    const cornerCoverage = 1024 * (Math.abs(Math.cos(radians)) + Math.abs(Math.sin(radians)));

    expect(1600 * scale).toBeGreaterThanOrEqual(cornerCoverage);
    expect(900 * scale).toBeGreaterThanOrEqual(cornerCoverage);
  });

  it('applies the crop region and resets rotation and zoom after cropping', async () => {
    const { page } = setup();
    const croppedPreview = 'data:image/jpeg;base64,cropped';
    const render = vi.spyOn(page as any, 'render').mockResolvedValue({
      toDataURL: () => croppedPreview,
    });
    page.rotation = 90;
    page.zoom = 1.25;

    await page.crop();

    expect(render).toHaveBeenCalledWith(true);
    expect(page.previewUrl()).toBe(croppedPreview);
    expect(page.rotation).toBe(0);
    expect(page.zoom).toBe(1);
    expect(page.cropMode).toBe(false);
  });

  it('supports repositioning a zoomed photo by pointer and keyboard', () => {
    const fixture = TestBed.createComponent(ProfilePhotoUpload);
    const page = fixture.componentInstance;
    page.previewUrl.set('data:image/jpeg;base64,draft');
    page.imageDimensions.set({ width: 1200, height: 900 });
    page.changeZoom('1.5');

    const element = {
      setPointerCapture: vi.fn(),
      getBoundingClientRect: () => ({ width: 1024, height: 1024 }),
    } as unknown as HTMLElement;
    page.panStart({
      pointerId: 1,
      clientX: 100,
      clientY: 100,
      currentTarget: element,
      preventDefault: vi.fn(),
    } as unknown as PointerEvent);
    page.panMove({
      pointerId: 1,
      clientX: 160,
      clientY: 130,
      currentTarget: element,
    } as unknown as PointerEvent);
    expect(page.panX).toBeGreaterThan(0);
    expect(page.panY).toBeGreaterThan(0);
    const keyboardEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft', cancelable: true });
    page.panByKeyboard(keyboardEvent);
    expect(keyboardEvent.defaultPrevented).toBe(true);
    expect(page.panX).toBeLessThan(60 / 1024);
  });

  it('clears file inputs after selection so the same photo can be selected again', () => {
    const page = TestBed.createComponent(ProfilePhotoUpload).componentInstance;
    const accept = vi.spyOn(page as any, 'accept');
    const file = new File(['photo'], 'photo.png', { type: 'image/png' });
    let value = 'C:\\fakepath\\photo.png';
    const input = {
      files: [file],
      get value() { return value; },
      set value(next: string) { value = next; },
    } as unknown as HTMLInputElement;
    const event = { target: input } as unknown as Event;

    page.select(event);
    expect(value).toBe('');
    page.select(event);
    expect(accept).toHaveBeenCalledTimes(2);
  });

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
