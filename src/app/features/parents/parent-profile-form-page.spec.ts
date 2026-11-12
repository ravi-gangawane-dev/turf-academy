import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Component } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { ParentsService } from '../../core/supabase/domain-services';
import { ParentProfileFormPage, nationalPhone } from './parent-profile-form-page';

@Component({ template: '', standalone: true })
class EmptyPage {}

const parentRecord = {
  id: 'parent-1',
  profile_id: 'profile-1',
  full_name: 'QA Parent',
  relation: 'Guardian',
  phone: '+919130451715',
  whatsapp: '+919130451715',
  email: 'qa.parent@turf.local',
  occupation: null,
  address: { formatted: '12 MG Road', city: 'Pune', state: 'Maharashtra', pinCode: '411001' },
  photo_path: 'parent-1/photo.png',
  photo_url: 'https://cdn.example.com/parent.png',
};

async function setup() {
  const getByProfile = vi.fn().mockResolvedValue({ ...parentRecord });
  const updateOwnProfile = vi.fn().mockResolvedValue({ ...parentRecord });
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'parent/profile/edit', component: ParentProfileFormPage },
        { path: 'parent/profile', component: EmptyPage },
      ]),
      { provide: AuthService, useValue: { profile: () => ({ id: 'profile-1' }) } },
      { provide: ParentsService, useValue: { getByProfile, updateOwnProfile } },
    ],
  });
  const harness = await RouterTestingHarness.create('/parent/profile/edit');
  await harness.fixture.whenStable();
  harness.detectChanges();
  const root = harness.routeNativeElement as HTMLElement;
  const fileInput = () => root.querySelector<HTMLInputElement>('.upload input[type="file"]')!;
  const phone = () => root.querySelector<HTMLInputElement>('input[formcontrolname="phone"]')!;
  const submit = () => root.querySelector<HTMLButtonElement>('footer button[type="submit"]')!;
  const pick = async (file: File) => {
    const input = fileInput();
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });
    input.dispatchEvent(new Event('change'));
    if (file.type.startsWith('image/') && file.size <= 2 * 1024 * 1024) {
      await vi.waitFor(() => {
        harness.detectChanges();
        expect(root.querySelector('.photo img')?.getAttribute('src')).toContain('data:');
      });
    }
    await harness.fixture.whenStable();
    harness.detectChanges();
  };
  return { harness, root, getByProfile, updateOwnProfile, phone, submit, pick };
}

describe('Parent profile photo upload', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  it('makes stored numbers with a country code editable as 10 digits', () => {
    expect(nationalPhone('+919130451715')).toBe('9130451715');
    expect(nationalPhone('09130451715')).toBe('9130451715');
    expect(nationalPhone('9130451715')).toBe('9130451715');
    expect(nationalPhone(null)).toBe('');
  });

  it('loads the saved photo and a valid 10-digit phone', async () => {
    const { root, phone } = await setup();
    expect(phone().value).toBe('9130451715');
    expect(root.querySelector('.photo img')?.getAttribute('src')).toBe(
      'https://cdn.example.com/parent.png',
    );
  });

  it('previews the chosen photo and uploads it on save', async () => {
    const { root, updateOwnProfile, submit, pick } = await setup();

    await pick(new File(['binary'], 'avatar.png', { type: 'image/png' }));

    expect(root.querySelector('.photo img')?.getAttribute('src')).toContain('data:image/png');
    submit().click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(updateOwnProfile).toHaveBeenCalledTimes(1);
    const [payload, photo] = updateOwnProfile.mock.calls[0];
    expect(payload).toMatchObject({
      full_name: 'QA Parent',
      phone: '9130451715',
      whatsapp: '9130451715',
      address: { city: 'Pune', pinCode: '411001' },
    });
    expect(photo).toBeInstanceOf(File);
    expect(photo!.name).toBe('avatar.png');
  });

  it('rejects photos that are too large or not an image', async () => {
    const { root, updateOwnProfile, submit, pick } = await setup();

    await pick(new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' }));
    expect(root.querySelector('footer p')?.textContent).toContain('2 MB');
    expect(root.querySelector('.photo img')?.getAttribute('src')).toBe(
      'https://cdn.example.com/parent.png',
    );

    await pick(new File(['pdf'], 'notes.pdf', { type: 'application/pdf' }));
    expect(root.querySelector('footer p')?.textContent).toContain('JPG, PNG or WebP');

    submit().click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(updateOwnProfile).toHaveBeenCalledTimes(1);
    expect(updateOwnProfile.mock.calls[0][1]).toBeNull();
  });

  it('names the fields that block saving', async () => {
    const { harness, root, updateOwnProfile, submit } = await setup();
    const city = root.querySelector<HTMLInputElement>('input[formcontrolname="city"]')!;
    city.value = '';
    city.dispatchEvent(new Event('input'));
    await harness.fixture.whenStable();

    submit().click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(updateOwnProfile).not.toHaveBeenCalled();
    expect(root.querySelector('footer p')?.textContent).toContain('city');
  });

  it('returns to the parent profile after a successful save', async () => {
    const { harness, updateOwnProfile, submit } = await setup();
    submit().click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await harness.fixture.whenStable();
    expect(updateOwnProfile).toHaveBeenCalledTimes(1);
    expect(TestBed.inject(Router).url).toBe('/parent/profile');
  });
});
