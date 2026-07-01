import { Component, computed, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { ScreenChildItem } from '@shared/interfaces/access.interfaces';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';

import type {
  IStudyPlanGrade,
  IStudyPlanStage,
} from '../../study-plan-academics.component';

interface SubjectSummaryGradeItem {
  stageId: number;
  gradeId: number;
  label: string;
  count: number;
  pending: boolean;
}

interface SubjectSummaryStageItem {
  stageId: number;
  stageName: string;
  stageOrder: number;
  gradeItems: SubjectSummaryGradeItem[];
  gradeSubjects: number;
  crossovers: number;
  totalSubjects: number;
  configuredGrades: number;
  totalGrades: number;
  completed: boolean;
  hasCrossovers: boolean;
}

export interface StudyPlanStageGradeSelection {
  stageId: number;
  gradeId: number;
}

@Component({
  selector: 'app-study-plan-subjects-summary',
  standalone: true,
  imports: [TranslateModule, UiIconComponent],
  templateUrl: './study-plan-subjects-summary.component.html',
  styleUrl: './study-plan-subjects-summary.component.scss',
})
export class StudyPlanSubjectsSummaryComponent {
  readonly stages = input<IStudyPlanStage[]>([]);
  readonly grades = input<IStudyPlanGrade[]>([]);
  readonly child = input<ScreenChildItem | null | undefined>(null);

  readonly stageGradeSelected = output<StudyPlanStageGradeSelection>();
  readonly stageCrossoversSelected = output<number>();

  protected readonly disabled = computed(() => !this.child());

  protected readonly orderedGrades = computed(() => {
    return [...this.grades()].sort((a, b) => a.order - b.order);
  });

  protected readonly orderedStages = computed(() => {
    return [...this.stages()].sort((a, b) => a.order - b.order);
  });

  protected readonly stageItems = computed<SubjectSummaryStageItem[]>(() => {
    return this.orderedStages().map((stage) => {
      const summary = stage.subjects_summary;

      const totalGrades = summary?.total_grades ?? this.orderedGrades().length;
      const configuredGrades = summary?.configured_grades ?? 0;
      const crossovers = summary?.crossovers_count ?? 0;
      const totalSubjects = summary?.total_subjects ?? 0;

      const gradeItems: SubjectSummaryGradeItem[] = this.orderedGrades().map((grade) => {
        const summaryGrade = summary?.grades?.find((item) => item.grade_id === grade.id);
        const count = summaryGrade?.subjects_count ?? 0;

        return {
          stageId: stage.id,
          gradeId: grade.id,
          label: summaryGrade?.description || grade.description || summaryGrade?.name || grade.name,
          count,
          pending: count === 0,
        };
      });

      const gradeSubjects = Math.max(totalSubjects - crossovers, 0);

      return {
        stageId: stage.id,
        stageName: stage.name,
        stageOrder: stage.order,
        gradeItems,
        gradeSubjects,
        crossovers,
        totalSubjects,
        configuredGrades,
        totalGrades,
        completed: totalGrades > 0 && configuredGrades === totalGrades,
        hasCrossovers: crossovers > 0,
      };
    });
  });

  protected readonly summary = computed(() => {
    const stages = this.stageItems();

    const totalStages = stages.length;
    const totalGrades = this.orderedGrades().length;
    const totalGradeSlots = totalStages * totalGrades;

    const configuredGradeSlots = stages.reduce((total, stage) => {
      return total + stage.configuredGrades;
    }, 0);

    const gradeSubjects = stages.reduce((total, stage) => {
      return total + stage.gradeSubjects;
    }, 0);

    const crossovers = stages.reduce((total, stage) => {
      return total + stage.crossovers;
    }, 0);

    const totalSubjects = stages.reduce((total, stage) => {
      return total + stage.totalSubjects;
    }, 0);

    const coverage =
      totalGradeSlots > 0
        ? Math.round((configuredGradeSlots / totalGradeSlots) * 100)
        : 0;

    return {
      stages: totalStages,
      grades: totalGrades,
      totalGradeSlots,
      configuredGradeSlots,
      gradeSubjects,
      crossovers,
      totalSubjects,
      coverage,
      completed: totalGradeSlots > 0 && configuredGradeSlots === totalGradeSlots,
      hasSubjects: totalSubjects > 0,
      hasAcademicStructure: totalGradeSlots > 0,
      stageItems: stages,
    };
  });

  protected onStageGradeSelected(stageId: number, gradeId: number): void {
    if (this.disabled()) return;

    this.stageGradeSelected.emit({ stageId, gradeId });
  }

  protected onStageCrossoversSelected(stageId: number): void {
    if (this.disabled()) return;

    this.stageCrossoversSelected.emit(stageId);
  }
}
