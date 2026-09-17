import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NgTemplateOutlet } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import type { ISchoolYear } from '@shared/interfaces/administration.interfaces';
import type { IRubricType } from '@shared/interfaces/configuration.interfaces';
import type { IRubric, RubricDisplayMode } from '@shared/interfaces/planning.interfaces';
import type { IStudyPlanStage } from '@shared/interfaces/study-plan-interfaces';
import { FormErrorComponent } from '@shared/ui/form-error/form-error';
import { SkSelectComponent } from '@shared/ui/sk-select/sk-select.component';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

import { RubricDetailComponent } from '../rubric-detail/rubric-detail.component';
import type {
  RubricsIndexDto,
  RubricsListDto,
  RubricsMutationDto,
  RubricsStageOptionDto,
} from '../../rubrics.interfaces';

type RubricEditorState = { mode: 'create' } | { mode: 'edit'; rubricId: number };
type RubricMutationPayload = Pick<
  IRubric,
  | 'name'
  | 'qualifier'
  | 'description'
  | 'not_assessed_text'
  | 'display_mode'
  | 'show_scale_description'
  | 'automatic'
  | 'special_education'
  | 'accepts_special_education'
  | 'active'
  | 'rubric_type_id'
>;

const DISPLAY_MODE_OPTIONS: Array<{
  value: RubricDisplayMode;
  translation: string;
}> = [
  { value: 'name', translation: 'planning.rubrics.display-modes.name' },
  { value: 'description', translation: 'planning.rubrics.display-modes.description' },
  { value: 'both', translation: 'planning.rubrics.display-modes.both' },
];

@Component({
  selector: 'app-rubrics',
  imports: [
    FormErrorComponent,
    NgTemplateOutlet,
    ReactiveFormsModule,
    SkSelectComponent,
    TranslatePipe,
    UiButtonComponent,
    RubricDetailComponent,
  ],
  templateUrl: './rubrics.component.html',
  styleUrl: './rubrics.component.scss',
})
export class RubricsComponent extends SkolansBaseComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  protected readonly years = signal<ISchoolYear[]>([]);
  protected readonly stages = signal<IStudyPlanStage[]>([]);
  protected readonly rubrics = signal<IRubric[]>([]);
  protected readonly rubricTypes = signal<IRubricType[]>([]);
  protected readonly editor = signal<RubricEditorState | null>(null);
  protected readonly selectedRubric = signal<IRubric | null>(null);

  protected readonly yearControl = new FormControl<number | null>(null);
  protected readonly stageControl = new FormControl<number | null>(null);
  protected readonly gradeControl = new FormControl<number | null>(null);
  protected readonly rubricForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(70)],
    }),
    qualifier: new FormControl<string | null>(null, Validators.maxLength(45)),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    not_assessed_text: new FormControl<string | null>(null, Validators.maxLength(100)),
    display_mode: new FormControl<RubricDisplayMode | null>(null, Validators.required),
    show_scale_description: new FormControl(false, { nonNullable: true }),
    automatic: new FormControl(false, { nonNullable: true }),
    special_education: new FormControl(false, { nonNullable: true }),
    accepts_special_education: new FormControl(false, { nonNullable: true }),
    active: new FormControl(true, { nonNullable: true }),
    rubric_type_id: new FormControl<number | null>(null, Validators.required),
  });
  protected readonly displayModeOptions = DISPLAY_MODE_OPTIONS;
  protected readonly selectedStageId = toSignal(this.stageControl.valueChanges, {
    initialValue: this.stageControl.value,
  });
  protected readonly selectedStage = computed(
    () => this.stages().find((stage) => stage.id === this.selectedStageId()) ?? null,
  );
  protected readonly grades = computed(() => this.selectedStage()?.study_plan?.level?.grades ?? []);
  protected readonly stageOptions = computed<RubricsStageOptionDto[]>(() =>
    this.stages().map((stage) => ({
      id: stage.id,
      label: this.stageLabel(stage),
    })),
  );
  private rubricsRequestSequence = 0;

  ngOnInit(): void {
    this.initRouteMeta();
    this.bindSelections();
    this.loadBootstrap();
  }

  private loadBootstrap(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.executeSilentRequest<RubricsIndexDto>(this.api.get(route), (response) => {
      const data = response.data;
      const years = data.years ?? [];
      const stages = data.stages ?? [];
      this.years.set(years);
      this.stages.set(stages);
      this.rubricTypes.set(data.catalogs?.rubric_types ?? []);
      this.setScreenOptions(data.options ?? []);
      this.setScreenChildren(data.children ?? []);

      this.yearControl.setValue(years[0]?.id ?? null);
    });
  }

  private bindSelections(): void {
    this.stageControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.cancelEditor();
      this.gradeControl.setValue(null);
    });

    this.gradeControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((gradeId) => {
        const stageId = this.stageControl.value;

        if (stageId === null || gradeId === null) {
          this.cancelEditor();
          this.rubricsRequestSequence++;
          this.rubrics.set([]);
          return;
        }

        this.loadRubrics(stageId, gradeId);
      });
  }

  /** Opens the single local editor in create mode without changing the rubric collection. */
  protected startCreate(): void {
    if (
      this.editor() !== null ||
      this.yearControl.value === null ||
      this.stageControl.value === null ||
      this.gradeControl.value === null
    ) {
      return;
    }

    this.resetRubricForm();
    this.editor.set({ mode: 'create' });
  }

  /** Reuses the local editor at the selected rubric's visual position. */
  protected startEdit(rubric: IRubric): void {
    if (this.editor() !== null) {
      return;
    }

    this.rubricForm.reset({
      name: rubric.name,
      qualifier: rubric.qualifier,
      description: rubric.description,
      not_assessed_text: rubric.not_assessed_text,
      display_mode: rubric.display_mode,
      show_scale_description: rubric.show_scale_description,
      automatic: rubric.automatic,
      special_education: rubric.special_education,
      accepts_special_education: rubric.accepts_special_education,
      active: rubric.active,
      rubric_type_id: rubric.rubric_type_id,
    });
    this.editor.set({ mode: 'edit', rubricId: rubric.id });
  }

  /** Closes the visual-only editor and discards its local form values. */
  protected cancelEditor(): void {
    this.editor.set(null);
    this.resetRubricForm();
  }

  protected saveEditor(): void {
    if (this.rubricForm.invalid) {
      this.rubricForm.markAllAsTouched();
      return;
    }

    const editor = this.editor();
    const route = this.apiRoute();
    const stageId = this.stageControl.value;
    const gradeId = this.gradeControl.value;
    const values = this.rubricForm.getRawValue();

    if (
      !editor ||
      !route ||
      stageId === null ||
      gradeId === null ||
      values.display_mode === null ||
      values.rubric_type_id === null ||
      this.loading()
    ) {
      return;
    }

    const payload: RubricMutationPayload = {
      name: values.name,
      qualifier: values.qualifier,
      description: values.description,
      not_assessed_text: values.not_assessed_text,
      display_mode: values.display_mode,
      show_scale_description: values.show_scale_description,
      automatic: values.automatic,
      special_education: values.special_education,
      accepts_special_education: values.accepts_special_education,
      active: values.active,
      rubric_type_id: values.rubric_type_id,
    };
    const contextRoute = `${route}/${stageId}/grades/${gradeId}`;

    if (editor.mode === 'create') {
      this.executeMutationRequest(
        this.api.post<RubricsMutationDto>(contextRoute, payload),
        (response) => {
          this.rubrics.update((rubrics) => this.sortRubrics([...rubrics, response.data.rubric]));
          this.cancelEditor();
        },
      );
      return;
    }

    this.executeMutationRequest(
      this.api.put<RubricsMutationDto>(`${contextRoute}/${editor.rubricId}`, payload),
      (response) => {
        this.rubrics.update((rubrics) =>
          this.sortRubrics(
            rubrics.map((rubric) =>
              rubric.id === response.data.rubric.id ? response.data.rubric : rubric,
            ),
          ),
        );
        this.cancelEditor();
      },
    );
  }

  protected async deleteRubric(rubric: IRubric): Promise<void> {
    if (this.loading()) {
      return;
    }

    const route = this.apiRoute();
    const stageId = this.stageControl.value;
    const gradeId = this.gradeControl.value;

    if (!route || stageId === null || gradeId === null) {
      return;
    }

    const confirmed = await this.confirmDelete(
      'planning.rubrics.delete',
      'planning.rubrics.messages.confirm-delete',
      { name: rubric.name },
    );

    if (!confirmed || this.loading()) {
      return;
    }

    this.executeMutationRequest(
      this.api.delete(`${route}/${stageId}/grades/${gradeId}/${rubric.id}`),
      () => {
        this.rubrics.update((rubrics) => rubrics.filter((item) => item.id !== rubric.id));
      },
    );
  }

  protected openRubricDetail(rubric: IRubric): void {
    if (this.editor() !== null || this.getScreenChildren().length === 0) {
      return;
    }

    this.selectedRubric.set(rubric);
  }

  protected closeRubricDetail(): void {
    this.selectedRubric.set(null);
  }

  private resetRubricForm(): void {
    this.rubricForm.reset({
      name: '',
      qualifier: null,
      description: '',
      not_assessed_text: null,
      display_mode: null,
      show_scale_description: false,
      automatic: false,
      special_education: false,
      accepts_special_education: false,
      active: true,
      rubric_type_id: null,
    });
  }

  private loadRubrics(stageId: number, gradeId: number): void {
    const route = this.apiRoute();

    if (!route) {
      this.rubrics.set([]);
      return;
    }

    const requestSequence = ++this.rubricsRequestSequence;

    this.executeSilentRequest<RubricsListDto>(
      this.api.get(`${route}/${stageId}/grades/${gradeId}`),
      (response) => {
        if (requestSequence === this.rubricsRequestSequence) {
          this.rubrics.set(response.data.rubrics);
        }
      },
    );
  }

  private sortRubrics(rubrics: IRubric[]): IRubric[] {
    return [...rubrics].sort(
      (left, right) => left.name.localeCompare(right.name) || left.id - right.id,
    );
  }

  private stageLabel(stage: IStudyPlanStage): string {
    const studyPlanName = stage.study_plan?.name.trim() ?? '';
    const stageName = stage.name.trim();
    const sectionCapital = stage.study_plan?.section?.capital?.trim() ?? '';
    const name = [studyPlanName, stageName].filter(Boolean).join(' ');

    return sectionCapital ? `${name} (${sectionCapital})` : name;
  }
}
