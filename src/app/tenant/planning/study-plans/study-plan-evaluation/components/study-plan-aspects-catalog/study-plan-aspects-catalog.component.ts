import { Component, ElementRef, OnInit, computed, input, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import type { ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import type { IStudyPlanAspect } from '@shared/interfaces/study-plan-interfaces';
import { FormErrorComponent } from '@shared/ui/form-error/form-error';
import { SkolansTable } from '@shared/ui/skolans-table/skolans-table';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

interface StudyPlanAspectsCatalogPayload {
  options: ScreenOptionItem[];
  aspects: IStudyPlanAspect[];
  unused: number[];
  programming_aspect_id: number | null;
}

interface StudyPlanAspectMutationPayload {
  item: IStudyPlanAspect;
  options?: ScreenOptionItem[];
}

interface StudyPlanAspectCatalogItem extends IStudyPlanAspect {
  is_programming: boolean;
}

type AspectCatalogFilter = 'all' | 'unused';
type AspectEditorMode = 'add' | 'update';

@Component({
  selector: 'app-study-plan-aspects-catalog',
  imports: [
    FormErrorComponent,
    ReactiveFormsModule,
    SkolansTable,
    TranslatePipe,
    UiButtonComponent,
  ],
  templateUrl: './study-plan-aspects-catalog.component.html',
  styleUrl: './study-plan-aspects-catalog.component.scss',
})
export class StudyPlanAspectsCatalogComponent extends SkolansBaseComponent implements OnInit {
  readonly studyPlanId = input.required<number>();
  readonly route = input.required<string>();

  private readonly aspectsTable = viewChild<SkolansTable>('aspectsTable');
  private readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');

  protected readonly aspects = signal<IStudyPlanAspect[]>([]);
  protected readonly unusedAspectIds = signal<Set<number>>(new Set());
  protected readonly programmingAspectId = signal<number | null>(null);
  protected readonly selectedAspect = signal<IStudyPlanAspect | null>(null);
  protected readonly searchTerm = signal('');
  protected readonly activeFilter = signal<AspectCatalogFilter>('all');
  protected readonly editorMode = signal<AspectEditorMode | null>(null);
  private readonly editingAspectId = signal<number | null>(null);

  protected readonly editorForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    description: new FormControl<string | null>(null),
  });
  protected readonly isEditing = computed(() => this.editorMode() !== null);
  protected readonly selectedAspectIsUnused = computed(() => {
    const selected = this.selectedAspect();

    return selected !== null && this.unusedAspectIds().has(selected.id);
  });
  protected readonly canDeleteSelectedAspect = computed(() => {
    return this.selectedAspectIsUnused() && !this.loading();
  });

  protected readonly catalogItems = computed<StudyPlanAspectCatalogItem[]>(() =>
    this.aspects().map((aspect) => ({
      ...aspect,
      is_programming: aspect.id === this.programmingAspectId(),
    })),
  );
  protected readonly filteredAspects = computed(() => {
    const term = this.searchTerm().trim().toLocaleLowerCase();
    const unusedIds = this.unusedAspectIds();

    const filteredByType =
      this.activeFilter() === 'unused'
        ? this.catalogItems().filter((aspect) => unusedIds.has(aspect.id))
        : this.catalogItems();

    if (!term) {
      return filteredByType;
    }

    return filteredByType.filter(
      (aspect) =>
        aspect.name.toLocaleLowerCase().includes(term) ||
        aspect.description?.toLocaleLowerCase().includes(term),
    );
  });
  protected readonly tablePagination = computed(() => this.filteredAspects().length > 10);

  protected readonly getRowId = (params: { data: StudyPlanAspectCatalogItem }) =>
    String(params.data.id);

  protected readonly columnDefs = computed<ColDef<StudyPlanAspectCatalogItem>[]>(() => [
    {
      field: 'name',
      headerValueGetter: () => this.translate.instant('planning.study-plan-aspects.columns.name'),
      flex: 1,
      minWidth: 180,
    },
    {
      field: 'description',
      headerValueGetter: () =>
        this.translate.instant('planning.study-plan-aspects.columns.description'),
      flex: 2,
      minWidth: 240,
      valueFormatter: (params) =>
        params.value || this.translate.instant('planning.study-plan-aspects.no-description'),
    },
    {
      field: 'is_programming',
      headerValueGetter: () =>
        this.translate.instant('planning.study-plan-aspects.columns.programming'),
      width: 150,
      minWidth: 150,
      cellRenderer: (params: ICellRendererParams<StudyPlanAspectCatalogItem>) => {
        const active = params.data?.is_programming === true;
        const label = this.translate.instant(
          active
            ? 'planning.study-plan-aspects.programming.yes'
            : 'planning.study-plan-aspects.programming.no',
        );
        const background = active ? 'var(--color-success-soft)' : 'var(--color-surface-muted)';
        const color = active ? 'var(--color-success)' : 'var(--color-text-muted)';

        return `<span style="display:inline-flex;align-items:center;padding:0.15rem 0.55rem;border-radius:999px;background:${background};color:${color};font-size:0.75rem;font-weight:700;">${label}</span>`;
      },
    },
  ]);

  ngOnInit(): void {
    this.loadAspects();
  }

  protected onSearchInput(event: Event): void {
    if (this.isEditing()) {
      return;
    }

    const value = (event.target as HTMLInputElement).value;

    this.searchTerm.set(value);

    const selected = this.selectedAspect();

    if (selected && !this.filteredAspects().some((aspect) => aspect.id === selected.id)) {
      this.selectedAspect.set(null);
    }
  }

  protected onSelectionChange(rows: unknown[]): void {
    if (this.isEditing()) {
      return;
    }

    this.selectedAspect.set((rows[0] as IStudyPlanAspect | undefined) ?? null);
  }

  protected selectFilter(filter: AspectCatalogFilter): void {
    if (this.isEditing()) {
      return;
    }

    this.activeFilter.set(filter);
    this.searchTerm.set('');
    this.selectedAspect.set(null);
  }

  /** Opens the shared editor with empty values and no active catalog selection. */
  protected startAdd(): void {
    this.selectedAspect.set(null);
    this.aspectsTable()?.clearSelection();
    this.editingAspectId.set(null);
    this.editorForm.reset({ name: '', description: null });
    this.editorMode.set('add');
    this.focusNameInput();
  }

  /** Copies the selected aspect into isolated form state for edition. */
  protected startUpdate(): void {
    const selected = this.selectedAspect();

    if (!selected) {
      return;
    }

    this.editingAspectId.set(selected.id);
    this.editorForm.reset({
      name: selected.name,
      description: selected.description,
    });
    this.editorMode.set('update');
    this.focusNameInput();
  }

  /** Closes the editor without changing the catalog selection or API data. */
  protected cancelEditor(): void {
    this.closeEditor();
  }

  /** Deletes the selected aspect only when the catalog marks it as unused. */
  protected async deleteSelectedAspect(): Promise<void> {
    const selected = this.selectedAspect();

    if (!selected || !this.unusedAspectIds().has(selected.id) || this.loading()) {
      return;
    }

    const confirmationMessage = this.translate.instant(
      'planning.study-plan-aspects.delete-confirmation.message',
      { name: selected.name },
    );
    const confirmed = await this.confirmDelete(
      'planning.study-plan-aspects.delete-confirmation.title',
      confirmationMessage,
    );

    if (!confirmed || !this.unusedAspectIds().has(selected.id) || this.loading()) {
      return;
    }

    const catalogRoute = `${this.route()}/${this.studyPlanId()}`;

    this.executeMutationRequest<null>(this.api.delete(`${catalogRoute}/${selected.id}`), () => {
      this.loadAspects();
    });
  }

  /** Persists Add or Update through the endpoint owned by the catalog controller. */
  protected saveEditor(): void {
    const mode = this.editorMode();

    if (!mode || this.loading() || this.editorForm.invalid) {
      this.editorForm.markAllAsTouched();
      return;
    }

    const editingAspectId = this.editingAspectId();

    if (mode === 'update' && editingAspectId === null) {
      return;
    }

    const formValue = this.editorForm.getRawValue();
    const payload = {
      name: formValue.name.trim(),
      description: formValue.description?.trim() || null,
    };
    const catalogRoute = `${this.route()}/${this.studyPlanId()}`;
    const request =
      mode === 'add'
        ? this.api.post<StudyPlanAspectMutationPayload>(catalogRoute, payload)
        : this.api.put<StudyPlanAspectMutationPayload>(
            `${catalogRoute}/${editingAspectId}`,
            payload,
          );

    this.executeMutationRequest<StudyPlanAspectMutationPayload>(request, (response) => {
      if (response.data.options) {
        this.setScreenOptions(response.data.options);
      }

      this.closeEditor();
      this.loadAspects();
    });
  }

  private closeEditor(): void {
    this.editorMode.set(null);
    this.editingAspectId.set(null);
    this.editorForm.reset({ name: '', description: null });
  }

  private focusNameInput(): void {
    setTimeout(() => this.nameInput()?.nativeElement.focus());
  }

  private loadAspects(): void {
    this.executeSilentRequest<StudyPlanAspectsCatalogPayload>(
      this.api.get(`${this.route()}/${this.studyPlanId()}`),
      (response) => {
        this.aspects.set(response.data.aspects);
        this.unusedAspectIds.set(new Set(response.data.unused));
        this.programmingAspectId.set(response.data.programming_aspect_id);
        this.selectedAspect.set(null);
        this.setScreenOptions(response.data.options);
      },
    );
  }
}
