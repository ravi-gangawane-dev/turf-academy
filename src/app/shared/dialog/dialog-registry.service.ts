import { Injectable, computed, inject, signal } from '@angular/core';
import { DialogService } from './dialog.service';
import { DialogConfig, DialogResult, DialogType } from './models/dialog-config.model';
import { DIALOG_TEMPLATE_REGISTRY, DialogRegistryEntry } from './registry/dialog-template.registry';

/**
 * Read access to the centralized dialog registry.
 * Playground previews always go through DialogService with `preview: true`,
 * so they render the production templates and cannot mutate real data.
 */
@Injectable({ providedIn: 'root' })
export class DialogRegistryService {
  private readonly dialogs = inject(DialogService);
  private readonly entries = signal<readonly DialogRegistryEntry[]>(DIALOG_TEMPLATE_REGISTRY);

  readonly templates = this.entries.asReadonly();
  readonly count = computed(() => this.entries().length);

  get(type: DialogType): DialogRegistryEntry | undefined {
    return this.entries().find((entry) => entry.type === type);
  }

  /** Application modules that open a given dialog type. */
  usage(type: DialogType): readonly string[] {
    return this.get(type)?.usedBy ?? [];
  }

  configFor(type: DialogType, overrides: Partial<DialogConfig> = {}): DialogConfig {
    const entry = this.get(type);
    if (!entry) throw new Error(`No dialog registered for type "${type}"`);
    return { ...entry.defaultConfig, ...overrides, type };
  }

  /** Open a registered dialog in isolated preview mode. */
  preview(type: DialogType, overrides: Partial<DialogConfig> = {}): Promise<DialogResult> {
    return this.dialogs.open({ ...this.configFor(type, overrides), preview: true });
  }
}
