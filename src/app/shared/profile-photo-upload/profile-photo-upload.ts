import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnDestroy, Output, inject, signal } from '@angular/core';
import { ToastService } from '../toast/toast.service';
import { ModalFocus } from '../interaction-dialog/modal-focus';

type PhotoMode = 'upload' | 'camera';

export function photoCoverScale(
  width: number,
  height: number,
  rotationDegrees: number,
  size = 1024,
  zoom = 1,
): number {
  const radians = rotationDegrees * Math.PI / 180;
  const coverage = size * (Math.abs(Math.cos(radians)) + Math.abs(Math.sin(radians)));
  return Math.max(coverage / width, coverage / height) * zoom;
}

@Component({
  selector: 'app-profile-photo-upload',
  standalone: true,
  imports: [ModalFocus],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile-photo-upload.html',
  styleUrl: './profile-photo-upload.scss',
})
export class ProfilePhotoUpload implements OnDestroy {
  @Input() label = 'Profile';
  @Input() photoUrl: string | null = null;
  @Input() avatar = false;
  @Input() initials = '';
  @Input() selected = false;
  @Input() saving = false;
  @Output() fileSelected = new EventEmitter<File>();
  @Input() saveAction?: () => Promise<boolean>;

  rotation = 0;
  zoom = 1;
  open = false;
  cropMode = true;
  mode: PhotoMode = 'upload';
  readonly processing = signal(false);
  readonly previewUrl = signal<string | null>(null);
  readonly error = signal('');
  readonly cameraStream = signal<MediaStream | null>(null);
  readonly cameraStarting = signal(false);
  readonly imageDimensions = signal<{ readonly width: number; readonly height: number } | null>(null);
  private originalUrl: string | null = null;
  private readonly toast = inject(ToastService);
  private destroyed = false;
  private panPointerId: number | null = null;
  private panDragStart = { x: 0, y: 0 };
  private panOrigin = { x: 0, y: 0 };
  panX = 0;
  panY = 0;
  edited = false;

  begin(): void {
    if (this.saving || this.processing()) return;
    this.stopCamera();
    this.originalUrl = this.photoUrl;
    this.previewUrl.set(this.photoUrl);
    this.rotation = 0;
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.imageDimensions.set(null);
    this.edited = false;
    this.cropMode = true;
    this.mode = 'upload';
    this.error.set('');
    this.open = true;
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.stopCamera();
  }

  private accept(file: File): void {
    if (this.saving || this.processing()) return;
    if (file.size > 2 * 1024 * 1024 || !['image/jpeg', 'image/png'].includes(file.type)) {
      this.error.set('Choose a JPG or PNG image up to 2 MB.');
      this.toast.error('Choose a JPG or PNG image up to 2 MB.');
      return;
    }

    this.error.set('');
    const reader = new FileReader();
    this.processing.set(true);
    reader.onerror = () => {
      this.processing.set(false);
      this.error.set('Unable to read this photo. Please choose it again.');
    };
    reader.onload = async () => {
      if (typeof reader.result !== 'string') {
        this.processing.set(false);
        this.error.set('Unable to read this photo. Please choose it again.');
        return;
      }
      try {
        const image = new Image();
        image.src = reader.result;
        await image.decode();
        this.originalUrl = reader.result;
        this.previewUrl.set(reader.result);
        this.imageDimensions.set({ width: image.naturalWidth, height: image.naturalHeight });
        this.rotation = 0;
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.cropMode = true;
        this.edited = true;
        this.error.set('');
      } catch {
        this.error.set('This photo could not be decoded. Choose another JPG or PNG image.');
      } finally {
        this.processing.set(false);
      }
    };
    reader.readAsDataURL(file);
  }

  select(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) {
      this.stopCamera();
      this.mode = 'upload';
      this.accept(file);
    }
  }

  drop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) this.accept(file);
  }

  async selectMode(mode: PhotoMode): Promise<void> {
    if (this.saving || this.processing()) return;
    this.error.set('');
    this.mode = mode;
    if (mode === 'upload') {
      this.stopCamera();
      return;
    }
    await this.startCamera();
  }

  private async startCamera(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.error.set('Camera access is not available in this browser. Use Choose File or Take Photo instead.');
      return;
    }
    if (this.cameraStarting()) return;
    this.stopCamera();
    this.cameraStarting.set(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'user' },
      });
      if (this.destroyed || !this.open || this.mode !== 'camera') {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      this.cameraStream.set(stream);
    } catch (error) {
      const cameraError = error && typeof error === 'object' && 'name' in error
        ? String(error.name)
        : '';
      this.error.set(
        cameraError === 'NotAllowedError'
          ? 'Camera permission was denied. Allow camera access or use Take Photo.'
          : cameraError === 'NotFoundError'
            ? 'No camera was found. Use Choose File or Take Photo instead.'
            : 'Unable to start the camera. Use Choose File or Take Photo instead.',
      );
    } finally {
      this.cameraStarting.set(false);
    }
  }

  private stopCamera(): void {
    const stream = this.cameraStream();
    if (stream) stream.getTracks().forEach((track) => track.stop());
    this.cameraStream.set(null);
  }

  captureCameraPhoto(video: HTMLVideoElement): void {
    if (this.saving || this.processing() || !this.cameraStream()) return;
    if (!video.videoWidth || !video.videoHeight) {
      this.error.set('The camera is not ready yet. Try again in a moment.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      this.error.set('Unable to capture a photo from the camera.');
      return;
    }
    context.drawImage(video, 0, 0);
    this.originalUrl = canvas.toDataURL('image/jpeg', 0.9);
    this.previewUrl.set(this.originalUrl);
    this.imageDimensions.set({ width: video.videoWidth, height: video.videoHeight });
    this.rotation = 0;
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.cropMode = true;
    this.edited = true;
    this.error.set('');
    this.stopCamera();
    this.mode = 'upload';
  }

  rotate(): void {
    if (!this.saving && !this.processing() && this.previewUrl()) {
      this.rotation = (this.rotation + 90) % 360;
      this.clampPan();
      this.edited = true;
    }
  }

  changeZoom(value: string): void {
    if (this.saving || this.processing()) return;
    const zoom = Number(value);
    if (!Number.isFinite(zoom)) return;
    this.zoom = Math.max(1, Math.min(1.5, zoom));
    this.clampPan();
    this.edited = true;
  }

  imageLoaded(event: Event): void {
    const image = event.target as HTMLImageElement;
    if (image.naturalWidth && image.naturalHeight) {
      this.imageDimensions.set({ width: image.naturalWidth, height: image.naturalHeight });
      this.clampPan();
    }
  }

  previewImageWidth(): number {
    const dimensions = this.imageDimensions();
    return dimensions
      ? dimensions.width * photoCoverScale(dimensions.width, dimensions.height, this.rotation, 1024, this.zoom) / 1024 * 100
      : 100;
  }

  previewImageHeight(): number {
    const dimensions = this.imageDimensions();
    return dimensions
      ? dimensions.height * photoCoverScale(dimensions.width, dimensions.height, this.rotation, 1024, this.zoom) / 1024 * 100
      : 100;
  }

  panStart(event: PointerEvent): void {
    if (!this.previewUrl() || this.saving || this.processing()) return;
    event.preventDefault();
    this.panPointerId = event.pointerId;
    this.panDragStart = { x: event.clientX, y: event.clientY };
    this.panOrigin = { x: this.panX, y: this.panY };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  panMove(event: PointerEvent): void {
    if (this.panPointerId !== event.pointerId) return;
    const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    this.panX = this.panOrigin.x + (event.clientX - this.panDragStart.x) / bounds.width;
    this.panY = this.panOrigin.y + (event.clientY - this.panDragStart.y) / bounds.height;
    this.clampPan();
    this.edited = true;
  }

  panEnd(event: PointerEvent): void {
    if (this.panPointerId !== event.pointerId) return;
    this.panPointerId = null;
    const target = event.currentTarget as HTMLElement;
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
  }

  panByKeyboard(event: KeyboardEvent): void {
    const directions: Record<string, readonly [number, number]> = {
      ArrowLeft: [-0.025, 0],
      ArrowRight: [0.025, 0],
      ArrowUp: [0, -0.025],
      ArrowDown: [0, 0.025],
    };
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    this.panX += direction[0];
    this.panY += direction[1];
    this.clampPan();
    this.edited = true;
  }

  private clampPan(): void {
    const dimensions = this.imageDimensions();
    if (!dimensions) {
      this.panX = 0;
      this.panY = 0;
      return;
    }
    const size = 1024;
    const radians = this.rotation * Math.PI / 180;
    const cosine = Math.abs(Math.cos(radians));
    const sine = Math.abs(Math.sin(radians));
    const scale = photoCoverScale(dimensions.width, dimensions.height, this.rotation, size, this.zoom);
    const cornerExtent = size / 2 * (cosine + sine);
    const marginX = Math.max(0, dimensions.width * scale / 2 - cornerExtent);
    const marginY = Math.max(0, dimensions.height * scale / 2 - cornerExtent);
    const maxX = Math.min(
      cosine > 0.0001 ? marginX / cosine : Infinity,
      sine > 0.0001 ? marginY / sine : Infinity,
    ) / size;
    const maxY = Math.min(
      sine > 0.0001 ? marginX / sine : Infinity,
      cosine > 0.0001 ? marginY / cosine : Infinity,
    ) / size;
    this.panX = Math.max(-maxX, Math.min(maxX, this.panX));
    this.panY = Math.max(-maxY, Math.min(maxY, this.panY));
  }

  reset(): void {
    if (this.saving || this.processing()) return;
    this.rotation = 0;
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.cropMode = true;
    this.previewUrl.set(this.originalUrl);
    this.panPointerId = null;
    this.edited = this.originalUrl !== this.photoUrl;
    this.error.set('');
  }

  close(): void {
    if (this.saving || this.processing()) return;
    this.stopCamera();
    this.open = false;
  }

  private async render(crop: boolean): Promise<HTMLCanvasElement> {
    const source = this.previewUrl();
    if (!source) throw new Error('Select a photo first.');
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = source;
    await image.decode();

    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Unable to prepare the photo for editing.');

    const radians = this.rotation * Math.PI / 180;
    const scale = photoCoverScale(image.naturalWidth, image.naturalHeight, this.rotation, size, this.zoom);
    context.translate(size / 2, size / 2);
    context.rotate(radians);
    context.drawImage(
      image,
      -image.naturalWidth * scale / 2,
      -image.naturalHeight * scale / 2,
      image.naturalWidth * scale,
      image.naturalHeight * scale,
    );
    if (!crop) return canvas;
    const result = document.createElement('canvas');
    result.width = result.height = size;
    const cropInset = size * 0.14;
    const cropSize = size - cropInset * 2;
    const cropContext = result.getContext('2d');
    if (!cropContext) throw new Error('Unable to prepare the photo crop.');
    cropContext.drawImage(canvas, cropInset, cropInset, cropSize, cropSize, 0, 0, size, size);
    return result;
  }

  async crop(): Promise<void> {
    if (this.processing() || this.saving || !this.previewUrl()) return;
    this.processing.set(true);
    try {
      const canvas = await this.render(true);
      this.previewUrl.set(canvas.toDataURL('image/jpeg', 0.9));
      this.rotation = 0;
      this.zoom = 1;
      this.panX = 0;
      this.panY = 0;
      this.imageDimensions.set({ width: 1024, height: 1024 });
      this.edited = true;
      this.cropMode = false;
    } catch {
      this.error.set('Unable to crop this image. Please choose the photo again.');
    } finally {
      this.processing.set(false);
    }
  }

  async saveAndClose(): Promise<void> {
    if (this.processing() || this.saving || !this.edited) return;
    this.processing.set(true);
    this.error.set('');
    try {
      const canvas = await this.render(false);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (value) => value ? resolve(value) : reject(new Error('Image export failed')),
          'image/jpeg',
          0.9,
        ),
      );
      if (blob.size > 2 * 1024 * 1024) throw new Error('Edited photo exceeds 2 MB.');
      this.fileSelected.emit(new File([blob], 'profile-photo.jpg', { type: 'image/jpeg' }));
      if (this.saveAction && !(await this.saveAction())) {
        this.error.set('Photo was not saved. Check the form and try again. Your edits are still here.');
        return;
      }
      this.stopCamera();
      this.open = false;
    } catch {
      this.error.set('Unable to save this photo. Your edits are still here. Please try again.');
    } finally {
      this.processing.set(false);
    }
  }
}
