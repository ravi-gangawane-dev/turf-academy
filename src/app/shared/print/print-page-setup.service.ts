import { Injectable, signal } from '@angular/core';
import type { PrintDocument, PrintPageSetup } from './print-document.models';
import {
  FALLBACK_PAGE_SETUP,
  PRINT_DEFAULT_PAGE_SETUP,
  isPrintPageSetup,
  printPageRule,
  supportsPageSetup,
} from './print-page-setup';

const STORAGE_KEY = 'academy-print-page-setup';
const PRINT_STYLE_ID = 'academy-print-page-setup-style';

type PageSetupOverrides = Partial<Record<PrintDocument['kind'], PrintPageSetup>>;

/**
 * Remembers the paper size and orientation a user picked for each document
 * type. The choice is a device preference, not academy data, so it stays in
 * local storage and never leaves the browser.
 */
@Injectable({ providedIn: 'root' })
export class PrintPageSetupService {
  private readonly overrides = signal<PageSetupOverrides>(readStoredOverrides());

  setupFor(kind: PrintDocument['kind']): PrintPageSetup {
    const override = this.overrides()[kind];
    return override && supportsPageSetup(kind)
      ? override
      : PRINT_DEFAULT_PAGE_SETUP[kind] ?? FALLBACK_PAGE_SETUP;
  }

  /** True when the user has chosen a setup for this document type. */
  hasOverride(kind: PrintDocument['kind']): boolean {
    return Boolean(this.overrides()[kind]);
  }

  /** Store a choice for this document type and return what will be used. */
  save(kind: PrintDocument['kind'], setup: PrintPageSetup): PrintPageSetup {
    if (!supportsPageSetup(kind) || !isPrintPageSetup(setup)) {
      return this.setupFor(kind);
    }
    const next: PageSetupOverrides = { ...this.overrides(), [kind]: setup };
    this.overrides.set(next);
    persist(next);
    return setup;
  }

  /** Forget the remembered choice and return to the document default. */
  reset(kind: PrintDocument['kind']): PrintPageSetup {
    const next: PageSetupOverrides = { ...this.overrides() };
    delete next[kind];
    this.overrides.set(next);
    persist(next);
    return this.setupFor(kind);
  }

  /** Apply the remembered setup as a late `@page` rule for the print run. */
  applyForPrint(kind: PrintDocument['kind']): void {
    if (typeof document === 'undefined') return;
    let style = document.getElementById(PRINT_STYLE_ID) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = PRINT_STYLE_ID;
      document.head.appendChild(style);
    }
    style.textContent = printPageRule(kind, this.setupFor(kind));
  }

  /** Remove the one-run override so the next document keeps its own default. */
  clearPrintSetup(): void {
    if (typeof document === 'undefined') return;
    document.getElementById(PRINT_STYLE_ID)?.remove();
  }
}

function readStoredOverrides(): PageSetupOverrides {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const stored: PageSetupOverrides = {};
    for (const [kind, setup] of Object.entries(parsed as Record<string, unknown>)) {
      if (kind in PRINT_DEFAULT_PAGE_SETUP && isPrintPageSetup(setup)) {
        stored[kind as PrintDocument['kind']] = setup;
      }
    }
    return stored;
  } catch {
    // Private browsing or a corrupted value must not block printing.
    return {};
  }
}

function persist(overrides: PageSetupOverrides): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // A full or unavailable store only costs the remembered choice.
  }
}
