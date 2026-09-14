import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, OnInit, computed, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import type { ScreenChildItem, ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import type { IAcademicTutor, IGradebookAttendance, IGradebookType, ILanguage } from '@shared/interfaces/configuration.interfaces';
import type {
  IAcademy,
  IGradebookReport,
  IStudyPlanStage,
} from '@shared/interfaces/study-plan-interfaces';
import { FormErrorComponent } from '@shared/ui/form-error/form-error';
import { SkSelectComponent } from '@shared/ui/sk-select/sk-select.component';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';

import { StudyPlanReportCardDetailComponent } from './components/study-plan-report-card-detail/study-plan-report-card-detail.component';
import type { StudyPlanReportCardItemDto } from './study-plan-report-cards.interfaces';

interface StudyPlanReportCardStageDto extends Pick<IStudyPlanStage, 'id' | 'name' | 'order'> {
  gradebooks: StudyPlanReportCardItemDto[];
}

interface StudyPlanReportCardsCatalogsDto {
  gradebook_types: Pick<IGradebookType, 'id' | 'name' | 'translation'>[];
  gradebook_reports: Pick<IGradebookReport, 'id' | 'description'>[];
  academic_tutors: Pick<IAcademicTutor, 'id' | 'name' | 'translation'>[];
  gradebook_attendances: Pick<IGradebookAttendance, 'id' | 'name' | 'translation'>[];
  academies: Pick<IAcademy, 'id' | 'name'>[];
  comment_languages: Pick<ILanguage, 'id' | 'name' | 'label'>[];
}

interface StudyPlanReportCardsDataDto {
  stages: StudyPlanReportCardStageDto[];
  catalogs: StudyPlanReportCardsCatalogsDto;
  options: ScreenOptionItem[];
  children: ScreenChildItem[];
}

interface StudyPlanReportCardMutationDataDto {
  gradebook: StudyPlanReportCardItemDto;
}

interface StudyPlanReportCardOrderDataDto {
  stage_id: number;
  gradebooks: Array<Pick<StudyPlanReportCardItemDto, 'id' | 'order'>>;
}

type StudyPlanReportCardEditorMode = 'create' | 'update';

@Component({
  selector: 'app-study-plan-report-cards',
  imports: [
    DragDropModule,
    FormErrorComponent,
    ReactiveFormsModule,
    SkSelectComponent,
    TranslatePipe,
    UiButtonComponent,
    UiIconComponent,
    StudyPlanReportCardDetailComponent,
  ],
  templateUrl: './study-plan-report-cards.component.html',
  styleUrl: './study-plan-report-cards.component.scss',
})
export class StudyPlanReportCardsComponent extends SkolansBaseComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  readonly studyPlanId = input<number | null>(null);
  readonly route = input<string | null>(null);

  protected readonly stages = signal<StudyPlanReportCardStageDto[]>([]);
  protected readonly catalogs = signal<StudyPlanReportCardsCatalogsDto | null>(null);
  protected readonly selectedStageId = signal<number | null>(null);
  protected readonly editorMode = signal<StudyPlanReportCardEditorMode | null>(null);
  protected readonly selectedGradebook = signal<StudyPlanReportCardItemDto | null>(null);
  private readonly editingGradebookId = signal<number | null>(null);
  protected readonly selectedStage = computed(
    () => this.stages().find((stage) => stage.id === this.selectedStageId()) ?? null,
  );
  protected readonly editorTitle = computed(() => {
    const mode = this.editorMode();

    return mode ? this.getScreenOption(mode === 'create' ? 'add' : 'update')?.translation ?? '' : '';
  });
  protected readonly gradebookForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    translation: [null as string | null, [Validators.maxLength(200)]],
    gradebook_type_id: [null as number | null, [Validators.required]],
    gradebook_report_id: [null as number | null, [Validators.required]],
    academic_tutor_id: [null as number | null],
    gradebook_attendance_id: [null as number | null, [Validators.required]],
    academy_id: [null as number | null],
    comment_language_id: [null as number | null],
  });

  constructor() {
    super();

    effect(() => this.setReportCardsAssistantContext());
  }

  ngOnInit(): void {
    this.initRouteMeta();
    this.loadReportCards();
  }

  private loadReportCards(keepSelectedStageId: number | null = this.selectedStageId()): void {
    const route = this.route();

    if (!route || !this.studyPlanId()) {
      return;
    }

    this.executeSilentRequest<StudyPlanReportCardsDataDto>(this.api.get(route), (response) => {
      const stages = response.data.stages ?? [];
      const selectedStageId = stages.some((stage) => stage.id === keepSelectedStageId)
        ? keepSelectedStageId
        : (stages[0]?.id ?? null);

      this.stages.set(stages);
      this.catalogs.set(response.data.catalogs);
      this.selectedStageId.set(selectedStageId);
      this.setScreenOptions(response.data.options);
      this.setScreenChildren(response.data.children);
    });
  }

  protected updateGradebook(gradebook: StudyPlanReportCardItemDto): void {
    if (!this.getScreenOption('update')) {
      return;
    }

    this.editingGradebookId.set(gradebook.id);
    this.gradebookForm.reset({
      name: gradebook.name,
      translation: gradebook.translation,
      gradebook_type_id: gradebook.gradebook_type_id,
      gradebook_report_id: gradebook.gradebook_report_id,
      academic_tutor_id: gradebook.academic_tutor_id,
      gradebook_attendance_id: gradebook.gradebook_attendance_id,
      academy_id: gradebook.academy_id,
      comment_language_id: gradebook.comment_language_id,
    });
    this.editorMode.set('update');
  }

  protected openGradebookDetail(gradebook: StudyPlanReportCardItemDto): void {
    this.selectedGradebook.set(gradebook);
  }

  protected closeGradebookDetail(): void {
    this.selectedGradebook.set(null);
  }

  protected startCreateGradebook(): void {
    if (!this.selectedStage() || !this.getScreenOption('add')) {
      return;
    }

    this.editingGradebookId.set(null);
    this.gradebookForm.reset({
      name: '',
      translation: null,
      gradebook_type_id: null,
      gradebook_report_id: null,
      academic_tutor_id: null,
      gradebook_attendance_id: null,
      academy_id: null,
      comment_language_id: null,
    });
    this.editorMode.set('create');
  }

  protected cancelEditor(): void {
    this.closeEditor();
  }

  protected saveGradebook(): void {
    const route = this.route();
    const stage = this.selectedStage();
    const mode = this.editorMode();
    const editingGradebookId = this.editingGradebookId();

    if (!route || !stage || !mode || this.loading()) {
      return;
    }

    this.gradebookForm.markAllAsTouched();

    if (this.gradebookForm.invalid || (mode === 'update' && editingGradebookId === null)) {
      return;
    }

    const form = this.gradebookForm.getRawValue();
    const payload = {
      name: form.name?.trim() ?? '',
      translation: form.translation?.trim() || null,
      gradebook_type_id: form.gradebook_type_id,
      gradebook_report_id: form.gradebook_report_id,
      academic_tutor_id: form.academic_tutor_id,
      gradebook_attendance_id: form.gradebook_attendance_id,
      academy_id: form.academy_id,
      comment_language_id: form.comment_language_id,
    };
    const request =
      mode === 'create'
        ? this.api.post<StudyPlanReportCardMutationDataDto>(route, {
            ...payload,
            stage_id: stage.id,
          })
        : this.api.put<StudyPlanReportCardMutationDataDto>(
            `${route}/${editingGradebookId}`,
            payload,
          );

    this.executeMutationRequest<StudyPlanReportCardMutationDataDto>(request, (response) => {
      const gradebook = response.data.gradebook;

      this.stages.update((stages) =>
        stages.map((currentStage) => {
          if (mode === 'create' && currentStage.id === stage.id) {
            return {
              ...currentStage,
              gradebooks: [...currentStage.gradebooks, gradebook].sort(
                (first, second) => first.order - second.order,
              ),
            };
          }

          if (mode === 'update') {
            return {
              ...currentStage,
              gradebooks: currentStage.gradebooks.map((currentGradebook) =>
                currentGradebook.id === gradebook.id ? gradebook : currentGradebook,
              ),
            };
          }

          return currentStage;
        }),
      );
      this.closeEditor();
    });
  }

  protected async requestDeleteGradebook(gradebook: StudyPlanReportCardItemDto): Promise<void> {
    const route = this.route();
    const stageId = this.selectedStageId();
    const deleteOption = this.getScreenOption('delete');

    if (!route || !deleteOption || this.loading()) {
      return;
    }

    const confirmed = await this.confirmDelete(
      deleteOption.translation,
      this.translate.instant('planning.study-plan-report-cards.messages.confirm-delete', {
        name: gradebook.name,
      }),
    );

    if (!confirmed || this.loading()) {
      return;
    }

    this.executeMutationRequest<{ gradebook_id: number; stage_id: number }>(
      this.api.delete(`${route}/${gradebook.id}`),
      () => this.loadReportCards(stageId),
    );
  }

  protected onGradebooksDropped(event: CdkDragDrop<StudyPlanReportCardItemDto[]>): void {
    const route = this.route();
    const stage = this.selectedStage();

    if (!route || !stage || !this.getScreenOption('order') || this.loading()) {
      return;
    }

    if (event.previousIndex === event.currentIndex) {
      return;
    }

    const previousGradebooks = [...stage.gradebooks];
    const gradebooks = [...stage.gradebooks];

    moveItemInArray(gradebooks, event.previousIndex, event.currentIndex);

    this.stages.update((stages) =>
      stages.map((currentStage) =>
        currentStage.id === stage.id ? { ...currentStage, gradebooks } : currentStage,
      ),
    );

    const rollback = (): void => {
      this.stages.update((stages) =>
        stages.map((currentStage) =>
          currentStage.id === stage.id
            ? { ...currentStage, gradebooks: previousGradebooks }
            : currentStage,
        ),
      );
    };
    const payload = {
      stage_id: stage.id,
      gradebooks: gradebooks.map((gradebook) => gradebook.id),
    };

    this.request(
      this.api.put<StudyPlanReportCardOrderDataDto>(`${route}/order`, payload, { loader: false }),
    ).subscribe({
      next: (response) => {
        if (this.handleApiFailure(response)) {
          rollback();
        }
      },
      error: () => {
        rollback();
        this.ignoreHandledRequestError();
      },
    });
  }

  private closeEditor(): void {
    this.editorMode.set(null);
    this.editingGradebookId.set(null);
    this.gradebookForm.reset();
  }

  private setReportCardsAssistantContext(): void {
    const selectedStage = this.selectedStage();

    this.setAssistantContext({
      contextType: 'section',
      contextId: 'planning.study-plans.report-cards',
      feature: 'study-plans',
      title: 'controllers.study-plan-report-cards',
      entity: 'StudyPlan',
      mode: this.editorMode() ?? (this.selectedGradebook() ? 'report-card-detail' : 'report-cards'),
      data: {
        studyPlanId: this.studyPlanId(),
        stagesCount: this.stages().length,
        selectedStageId: selectedStage?.id ?? null,
        selectedStageName: selectedStage?.name ?? null,
        gradebooksCount: selectedStage?.gradebooks.length ?? 0,
        editingGradebookId: this.editingGradebookId(),
        gradebookId: this.selectedGradebook()?.id ?? null,
        gradebookName: this.selectedGradebook()?.name ?? null,
        gradebookType: this.selectedGradebook()?.gradebook_type?.translation ?? null,
        availableOptions: this.getAssistantAvailableOptions(),
      },
    });
  }
}
