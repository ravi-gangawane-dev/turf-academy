import { TestBed } from '@angular/core/testing';
import { StudentListService } from './student-list.service';
import { SupabaseClientService } from '../../core/supabase/supabase-client.service';
import { StorageService } from '../../core/supabase/storage.service';

describe('Student photo persistence', () => {
  afterEach(() => TestBed.resetTestingModule());

  function setup(saveError: object | null = null) {
    const read = { select: vi.fn(), eq: vi.fn(), single: vi.fn().mockResolvedValue({ data: { photo_path: 's1/old.png' }, error: null }) };
    read.select.mockReturnValue(read); read.eq.mockReturnValue(read);
    const write = vi.fn().mockResolvedValue({ data: saveError ? null : 's1', error: saveError });
    const client = { from: vi.fn().mockReturnValue(read), rpc: write };
    const storage = { upload: vi.fn().mockResolvedValue('s1/new.png'), signedUrl: vi.fn().mockResolvedValue('https://signed/new.png'), remove: vi.fn().mockResolvedValue(undefined) };
    TestBed.configureTestingModule({ providers: [
      { provide: SupabaseClientService, useValue: { requireClient: () => client } },
      { provide: StorageService, useValue: storage },
    ] });
    return { service: TestBed.inject(StudentListService), read, write, storage };
  }

  it('uploads under the student ID and links the persisted path before removing the old photo', async () => {
    const { service, read, write, storage } = setup();
    const file = new File(['image'], 'photo.png', { type: 'image/png' });
    expect(await service.updateStudentPhoto('s1', file)).toBe('https://signed/new.png');
    expect(read.eq).toHaveBeenCalledWith('id', 's1');
    expect(storage.upload).toHaveBeenCalledWith('student-photos', 's1', file);
    expect(write).toHaveBeenCalledWith('update_student_photo', { p_student_id: 's1', p_photo_path: 's1/new.png' });
    expect(storage.remove).toHaveBeenCalledWith('student-photos', 's1/old.png');
  });

  it('removes only the new upload if the API rejects the student update', async () => {
    const { service, storage } = setup({ message: 'Access denied', code: '42501' });
    await expect(service.updateStudentPhoto('s1', new File(['image'], 'photo.png'))).rejects.toThrow();
    expect(storage.remove).toHaveBeenCalledExactlyOnceWith('student-photos', 's1/new.png');
  });
});
