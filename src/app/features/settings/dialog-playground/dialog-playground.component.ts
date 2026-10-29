import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DialogRegistryService } from '../../../shared/dialog/dialog-registry.service';
import { DialogService } from '../../../shared/dialog/dialog.service';
import { DialogConfig, DialogResult, DialogType } from '../../../shared/dialog/models/dialog-config.model';
import { DialogRegistryEntry } from '../../../shared/dialog/registry/dialog-template.registry';

/**
 * Management and preview surface for the centralized dialog system.
 * Every preview here calls the same DialogService and shared templates the
 * production screens use, with `preview: true` so no feature action runs.
 */
@Component({
  selector: 'app-dialog-playground',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './dialog-playground.component.html',
  styleUrl: './dialog-playground.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogPlaygroundComponent implements OnDestroy {
  private readonly registry = inject(DialogRegistryService);
  private readonly dialogs = inject(DialogService);
  private readonly fb = inject(FormBuilder);

  readonly playgroundService = this.registry;
  protected readonly templates = this.registry.templates;
  protected readonly registryCount = this.registry.count;

  protected readonly searchQuery = signal('');
  protected readonly selectedCategory = signal('all');
  protected readonly selectedType = signal<DialogType>(DialogType.CONFIRM);

  protected readonly showPreview = signal(false);
  protected readonly previewConfig = signal<DialogConfig | null>(null);
  protected readonly previewResult = signal<DialogResult | null>(null);

  protected readonly categories = [
    { value: 'confirmation', label: 'Confirmation' },
    { value: 'feedback', label: 'Feedback' },
    { value: 'form', label: 'Form' },
    { value: 'media', label: 'Media' },
    { value: 'system', label: 'System' },
  ];

  protected readonly sizes = [
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
    { value: 'full-screen', label: 'Full Screen' },
  ];

  protected readonly selectedEntry = computed<DialogRegistryEntry | undefined>(() =>
    this.templates().find((entry) => entry.type === this.selectedType()),
  );

  protected readonly usage = computed(() => this.selectedEntry()?.usedBy ?? []);

  protected readonly activeConfig = computed<DialogConfig | null>(() => {
    const entry = this.selectedEntry();
    if (!entry) return null;
    const overrides = this.formOverrides();
    return { ...entry.defaultConfig, ...overrides, type: entry.type, preview: true };
  });

  readonly configForm: FormGroup = this.fb.group({
    title: [this.registry.configFor(DialogType.CONFIRM).title],
    message: [this.registry.configFor(DialogType.CONFIRM).message ?? ''],
    size: ['medium'],
    confirmLabel: ['Confirm'],
    cancelLabel: ['Cancel'],
    showClose: [true],
    showCancel: [true],
    loading: [false],
    disableClose: [false],
  });

  protected filteredTemplates(): readonly DialogRegistryEntry[] {
    const query = this.searchQuery().trim().toLowerCase();
    const category = this.selectedCategory();
    return this.templates().filter((entry) => {
      const matchesQuery =
        !query ||
        entry.name.toLowerCase().includes(query) ||
        entry.description.toLowerCase().includes(query) ||
        (entry.defaultConfig.message ?? '').toLowerCase().includes(query);
      const matchesCategory = category === 'all' || entry.category === category;
      return matchesQuery && matchesCategory;
    });
  }

  protected onSearchChange(query: string): void {
    this.searchQuery.set(query.toLowerCase());
  }

  protected onCategoryChange(category: string): void {
    this.selectedCategory.set(category);
  }

  /** Load a registry template into the config editor. */
  protected selectTemplate(entry: DialogRegistryEntry): void {
    this.selectedType.set(entry.type);
    const config = entry.defaultConfig;
    this.configForm.reset({
      title: config.title,
      message: config.message ?? '',
      size: config.size ?? 'medium',
      confirmLabel: config.confirmLabel ?? 'OK',
      cancelLabel: config.cancelLabel ?? 'Cancel',
      showClose: config.showClose ?? true,
      showCancel: config.showCancel ?? true,
      loading: config.loading ?? false,
      disableClose: config.disableClose ?? false,
    });
  }

  /** Open the registered dialog through DialogService in isolated preview mode. */
  protected openPreview(config?: DialogConfig): void {
    const entry = this.selectedEntry();
    const resolved =
      config ??
      this.activeConfig() ??
      (entry ? this.registry.configFor(entry.type) : undefined);
    if (!resolved) return;

    this.previewConfig.set(resolved);
    this.previewResult.set(null);
    this.showPreview.set(true);

    void this.dialogs
      .open({ ...resolved, preview: true })
      .then((result) => this.previewResult.set(result))
      .finally(() => this.showPreview.set(false));
  }

  ngOnDestroy(): void {
    if (this.showPreview()) this.closePreview();
  }

  protected closePreview(): void {
    this.dialogs.closeAll();
    this.showPreview.set(false);
    this.previewConfig.set(null);
    this.previewResult.set(null);
  }

  /** Preview the current editor values. */
  protected applyConfig(): void {
    const entry = this.selectedEntry();
    if (!entry) return;
    this.openPreview(this.registry.configFor(entry.type, this.formOverrides()));
  }

  /** Preview the loading state of the selected template. */
  protected previewLoading(): void {
    const entry = this.selectedEntry();
    if (!entry) return;
    this.openPreview(this.registry.configFor(entry.type, { loading: true, disableClose: true }));
  }

  /** Preview the error state of the selected template. */
  protected previewError(): void {
    this.openPreview(
      this.registry.configFor(DialogType.ERROR, {
        title: 'Something went wrong',
        message: 'The request failed. This is a preview — no data was changed.',
      }),
    );
  }

  protected resetConfig(): void {
    const entry = this.selectedEntry();
    if (entry) this.selectTemplate(entry);
  }

  protected configJson(): string {
    return JSON.stringify(this.activeConfig(), null, 2);
  }

  protected componentFor(entry: DialogRegistryEntry): string {
    return entry.component;
  }

  private formOverrides(): Partial<DialogConfig> {
    const value = this.configForm.getRawValue();
    return {
      title: value.title,
      message: value.message,
      size: value.size,
      confirmLabel: value.confirmLabel,
      cancelLabel: value.cancelLabel,
      showClose: value.showClose,
      showCancel: value.showCancel,
      loading: value.loading,
      disableClose: value.disableClose,
    };
  }
}
