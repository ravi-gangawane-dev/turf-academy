import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DialogPlaygroundComponent } from './dialog-playground.component';
import { DialogRegistryService } from '../../../shared/dialog/dialog-registry.service';
import { DialogService } from '../../../shared/dialog/dialog.service';
import { DialogType } from '../../../shared/dialog/models/dialog-config.model';

describe('DialogPlaygroundComponent', () => {
  let fixture: ComponentFixture<DialogPlaygroundComponent>;
  let component: DialogPlaygroundComponent;
  let registry: DialogRegistryService;
  let dialogs: DialogService;
  let element: HTMLElement;

  const cardNames = () =>
    [...element.querySelectorAll('.template-card strong')].map((node) => node.textContent!.trim());

  const typeInSearch = (value: string) => {
    const input = element.querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DialogPlaygroundComponent] }).compileComponents();
    fixture = TestBed.createComponent(DialogPlaygroundComponent);
    component = fixture.componentInstance;
    registry = TestBed.inject(DialogRegistryService);
    dialogs = TestBed.inject(DialogService);
    element = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => dialogs.closeAll());

  it('lists every registered dialog type', () => {
    expect(cardNames().length).toBe(registry.count());
    expect(element.querySelector('.subtitle')?.textContent).toContain(`${registry.count()} registered dialog types`);
  });

  it('filters templates by search text', () => {
    typeInSearch('receipt');

    expect(cardNames()).toEqual(['Image preview']);
  });

  it('shows an empty state when nothing matches', () => {
    typeInSearch('definitely-not-a-dialog');

    expect(cardNames().length).toBe(0);
    expect(element.querySelector('.empty-state')?.textContent).toContain('No dialogs match this filter');
  });

  it('filters templates by category', () => {
    const formTag = [...element.querySelectorAll<HTMLButtonElement>('.category-tags .tag')].find(
      (tag) => tag.textContent?.trim() === 'Form',
    )!;
    formTag.click();
    fixture.detectChanges();

    const chips = [...element.querySelectorAll('.template-card .chip')].map((chip) => chip.textContent!.trim());
    expect(chips.length).toBeGreaterThan(0);
    expect(chips.every((chip) => chip === 'form')).toBe(true);
  });

  it('loads a selected template into the config editor and shows its usage', () => {
    const card = [...element.querySelectorAll<HTMLButtonElement>('.template-card')].find((node) =>
      node.textContent?.includes('WhatsApp confirmation'),
    )!;
    card.click();
    fixture.detectChanges();

    expect(element.querySelector('.editor-header h2')?.textContent).toContain('WhatsApp confirmation');
    expect(element.querySelector<HTMLInputElement>('#cfg-title')!.value).toBe('WhatsApp Confirmation');
    expect(element.querySelector('.usage-list')?.textContent).toContain('Attendance');
  });

  it('previews the selected template through the shared dialog service', async () => {
    const submit = [...element.querySelectorAll<HTMLButtonElement>('.editor-actions button')].find(
      (button) => button.textContent?.includes('Preview live'),
    )!;
    submit.click();
    fixture.detectChanges();

    expect(dialogs.isOpen()).toBe(true);
    expect(dialogs.active()?.config.type).toBe(DialogType.CONFIRM);
    expect(dialogs.active()?.config.preview).toBe(true);

    dialogs.close('confirm');
    await fixture.whenStable();
    await Promise.resolve();
    fixture.detectChanges();

    expect(dialogs.isOpen()).toBe(false);
    expect(element.querySelector('.preview-result')?.textContent).toContain('preview');
  });

  it('previews the loading state without running any feature action', () => {
    const loading = [...element.querySelectorAll<HTMLButtonElement>('.editor-actions button')].find(
      (button) => button.textContent?.includes('Loading state'),
    )!;
    loading.click();
    fixture.detectChanges();

    expect(dialogs.active()?.config.loading).toBe(true);
    expect(dialogs.active()?.config.disableClose).toBe(true);
    expect(dialogs.active()?.config.preview).toBe(true);
  });

  it('previews the error template regardless of the selected dialog', () => {
    const error = [...element.querySelectorAll<HTMLButtonElement>('.editor-actions button')].find(
      (button) => button.textContent?.includes('Error state'),
    )!;
    error.click();
    fixture.detectChanges();

    expect(dialogs.active()?.config.type).toBe(DialogType.ERROR);
    expect(dialogs.active()?.config.preview).toBe(true);
  });

  it('resets the editor back to the registry defaults', () => {
    const title = element.querySelector<HTMLInputElement>('#cfg-title')!;
    title.value = 'Custom title';
    title.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const reset = [...element.querySelectorAll<HTMLButtonElement>('.editor-actions button')].find(
      (button) => button.textContent?.includes('Reset'),
    )!;
    reset.click();
    fixture.detectChanges();

    expect(element.querySelector<HTMLInputElement>('#cfg-title')!.value).toBe(
      registry.configFor(DialogType.CONFIRM).title,
    );
  });

  it('closes a preview on destroy so no dialog outlives the page', () => {
    component.ngOnDestroy();
    expect(dialogs.isOpen()).toBe(false);
  });

  it('exposes the registry as the playground service', () => {
    expect(component.playgroundService).toBe(registry);
  });
});
