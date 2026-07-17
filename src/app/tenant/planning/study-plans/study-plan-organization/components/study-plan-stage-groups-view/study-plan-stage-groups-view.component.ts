import { Component, computed, effect, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';

import type {
  StudyPlanStageGroupsSelection,
  StudyPlanStageGroupsSummary,
} from '../../study-plan-organization.component';
import { StudyPlanStageGroupsListComponent } from '../study-plan-stage-groups-list/study-plan-stage-groups-list.component';

type StudyPlanStageGroupsSummaryStage = StudyPlanStageGroupsSummary['items'][number];
type StudyPlanStageGroupsSummaryGrade = StudyPlanStageGroupsSummaryStage['grades'][number];

@Component({
  selector: 'app-study-plan-stage-groups-view',
  imports: [
    TranslatePipe,
    UiButtonComponent,
    UiIconComponent,
    StudyPlanStageGroupsListComponent,
  ],
  templateUrl: './study-plan-stage-groups-view.component.html',
  styleUrl: './study-plan-stage-groups-view.component.scss',
})
export class StudyPlanStageGroupsViewComponent {
  readonly route = input<string | null>(null);
  readonly summary = input.required<StudyPlanStageGroupsSummary | null>();
  readonly stageId = input.required<number | null>();
  readonly gradeId = input.required<number | null>();
  readonly mode = input.required<'grade' | 'crossover' | null>();
  readonly back = output<void>();
  readonly saved = output<void>();

  private readonly selectedStageId = signal<number | null>(null);
  private readonly selectedGradeId = signal<number | null>(null);
  private readonly selectedMode = signal<'grade' | 'crossover' | null>(null);

  protected readonly stages = computed(() => this.summary()?.items ?? []);

  protected readonly selectedStage = computed(() => {
    const stageId = this.selectedStageId();

    if (stageId === null) {
      return null;
    }

    return this.stages().find((stage) => stage.id === stageId) ?? null;
  });

  protected readonly selectedGrade = computed(() => {
    const stage = this.selectedStage();
    const mode = this.selectedMode();

    if (!stage || !mode) {
      return null;
    }

    if (mode === 'crossover') {
      return stage.grades.find((grade) => grade.type === 'crossover') ?? null;
    }

    const gradeId = this.selectedGradeId();

    return stage.grades.find((grade) => grade.type === 'grade' && grade.id === gradeId) ?? null;
  });

  protected readonly selectedTitle = computed(() => {
    const grade = this.selectedGrade();

    if (!grade) {
      return 'common.no-data';
    }

    return grade.type === 'crossover' ? grade.description : grade.name;
  });

  protected readonly selectedDescription = computed(() => {
    const grade = this.selectedGrade();

    if (!grade || grade.type === 'crossover') {
      return '';
    }

    return grade.description ?? '';
  });
  protected readonly selectedListStageId = computed(() => this.selectedStageId());
  protected readonly selectedListGradeId = computed(() => this.selectedGradeId());
  protected readonly selectedListMode = computed(() => this.selectedMode());

  constructor() {
    effect(() => {
      this.selectedStageId.set(this.stageId());
      this.selectedGradeId.set(this.gradeId());
      this.selectedMode.set(this.mode());
    });
  }

  protected groupsTranslationKey(count: number): string {
    return count === 1
      ? 'planning.study-plan-organizations.stage-groups.group-count'
      : 'planning.study-plan-organizations.stage-groups.groups-count';
  }

  protected isSelected(
    stage: StudyPlanStageGroupsSummaryStage,
    grade: StudyPlanStageGroupsSummaryGrade,
  ): boolean {
    const mode = this.selectedMode();

    if (stage.id !== this.selectedStageId() || grade.type !== mode) {
      return false;
    }

    return grade.type === 'crossover' || grade.id === this.selectedGradeId();
  }

  protected selectGroup(
    stage: StudyPlanStageGroupsSummaryStage,
    grade: StudyPlanStageGroupsSummaryGrade,
  ): void {
    const selection: StudyPlanStageGroupsSelection = {
      stageId: stage.id,
      gradeId: grade.type === 'grade' ? grade.id : null,
      mode: grade.type,
    };

    this.selectedStageId.set(selection.stageId);
    this.selectedGradeId.set(selection.gradeId);
    this.selectedMode.set(selection.mode);
  }

  protected onBack(): void {
    this.back.emit();
  }

  protected onListSaved(): void {
    this.saved.emit();
  }
}
