import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { ToastService } from '../toast/toast.service';
import { ModalFocus } from '../interaction-dialog/modal-focus';

@Component({
  selector: 'app-profile-photo-upload',
  standalone: true,
  imports: [ModalFocus],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile-photo-upload.html',
  styleUrl: './profile-photo-upload.scss',
})
export class ProfilePhotoUpload {
  @Input() label = 'Profile';
  @Input() photoUrl: string | null = null;
  @Input() selected = false;
  @Input() saving = false;
  @Output() fileSelected = new EventEmitter<File>();
  @Input() saveAction?: () => Promise<boolean>;
  rotation = 0;
  zoom = 1;
  open = false;
  cropMode = true;
  readonly processing = signal(false);
  readonly previewUrl = signal<string | null>(null);
  readonly error = signal('');
  private originalUrl: string | null = null;
  private readonly toast = inject(ToastService);
  edited = false;
  begin(): void { if (this.saving || this.processing()) return; this.originalUrl = this.photoUrl; this.previewUrl.set(this.photoUrl); this.rotation = 0; this.zoom = 1; this.edited = false; this.cropMode = true; this.error.set(''); this.open = true; }
  private accept(file: File): void {
    if (this.saving || this.processing()) return;
    if (file.size > 2 * 1024 * 1024 || !['image/jpeg','image/png'].includes(file.type)) { this.toast.error('Choose a JPG or PNG image up to 2 MB.'); return; }
    const reader = new FileReader();
    this.processing.set(true);
    reader.onerror = () => { this.processing.set(false); this.error.set('Unable to read this photo. Please choose it again.'); };
    reader.onload = () => { this.originalUrl = String(reader.result); this.previewUrl.set(this.originalUrl); this.rotation = 0; this.zoom = 1; this.cropMode = true; this.edited = true; this.error.set(''); this.processing.set(false); };
    reader.readAsDataURL(file);
  }
  select(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.accept(file);
  }
  drop(event: DragEvent): void { event.preventDefault(); const file = event.dataTransfer?.files?.[0]; if (file) this.accept(file); }
  rotate(): void { if (!this.saving && !this.processing() && this.previewUrl()) { this.rotation = (this.rotation + 90) % 360; this.edited = true; } }
  changeZoom(value: string): void { if (this.saving || this.processing()) return; this.zoom = Number(value); this.edited = true; }
  reset(): void { if (this.saving || this.processing()) return; this.rotation = 0; this.zoom = 1; this.cropMode = true; this.previewUrl.set(this.originalUrl); this.edited = this.originalUrl !== this.photoUrl; }
  close(): void { if (!this.saving && !this.processing()) this.open = false; }
  private async render(crop: boolean): Promise<HTMLCanvasElement> {
    const source = this.previewUrl();
    if (!source) throw new Error('Select a photo first.');
    const image = new Image(); image.crossOrigin = 'anonymous'; image.src = source;
    await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;
    const scale = Math.max(1024 / image.naturalWidth, 1024 / image.naturalHeight) * this.zoom;
    ctx.translate(512,512); ctx.rotate(this.rotation * Math.PI / 180);
    ctx.drawImage(image,-image.naturalWidth*scale/2,-image.naturalHeight*scale/2,image.naturalWidth*scale,image.naturalHeight*scale);
    if (!crop) return canvas;
    const result = document.createElement('canvas'); result.width = result.height = 1024;
    result.getContext('2d')!.drawImage(canvas,1024*.14,1024*.14,1024*.72,1024*.72,0,0,1024,1024);
    return result;
  }
  async crop(): Promise<void> {
    if (this.processing() || this.saving || !this.previewUrl()) return;
    this.processing.set(true);
    try { const canvas = await this.render(true); this.previewUrl.set(canvas.toDataURL('image/jpeg',.9)); this.rotation = 0; this.zoom = 1; this.edited = true; this.cropMode = false; }
    catch { this.toast.error('Unable to crop this image. Please choose the photo again.'); }
    finally { this.processing.set(false); }
  }
  async saveAndClose(): Promise<void> {
    if (this.processing() || this.saving || !this.edited) return;
    this.processing.set(true);
    this.error.set('');
    try {
      const canvas = await this.render(false);
      const blob = await new Promise<Blob>((resolve,reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Image export failed')), 'image/jpeg', .9));
      if (blob.size > 2 * 1024 * 1024) throw new Error('Edited photo exceeds 2 MB.');
      this.fileSelected.emit(new File([blob], 'profile-photo.jpg', {type:'image/jpeg'}));
      if (this.saveAction && !(await this.saveAction())) {
        this.error.set('Photo was not saved. Check the form and try again. Your edits are still here.');
        return;
      }
      this.open = false;
    } catch { this.error.set('Unable to save this photo. Your edits are still here. Please try again.'); }
    finally { this.processing.set(false); }
  }
}

