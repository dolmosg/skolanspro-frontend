import { CommonModule } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { SkolansBaseComponent } from '@shared/base/skolans-base-component';

import { ScreenChildItem, ScreenOptionItem } from '@shared/interfaces/configuration.interfaces';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';

export interface IStudyPlanTermStatus {
  id: number;
  name: string;
  translation: string;
  css_class: string | null;
}

export interface IStudyPlanTerm {
  id: number;
  study_plan_stage_id: number;
  code: string;
  start_date: string;
  end_date: string;
  term_status_id: number;
  order: number;
  status?: IStudyPlanTermStatus | null;
}

export interface IStudyPlanStage {
  id: number;
  study_plan_id: number;
  name: string;
  start_date: string;
  end_date: string;
  order: number;
  terms?: IStudyPlanTerm[];
}

interface IStudyPlanCurrentTerm {
  stage: IStudyPlanStage;
  term: IStudyPlanTerm;
  type: 'current' | 'next' | 'last';
}

@Component({
  selector: 'app-study-plan-stages-summary',
  standalone: true,
  imports: [CommonModule, TranslateModule, UiButtonComponent, UiIconComponent],
  templateUrl: './study-plan-stages-summary.component.html',
  styleUrl: './study-plan-stages-summary.component.scss',
})
export class StudyPlanStagesSummaryComponent extends SkolansBaseComponent {
  readonly stages = input<IStudyPlanStage[]>([]);
  readonly child = input<ScreenChildItem | null>(null);
  readonly addStageOption = input<ScreenOptionItem | null>(null);
  readonly expectedStagesCount = input<number | null>(null);

  readonly addStage = output<void>();
  readonly stageSelected = output<number>();

  protected readonly stagesCount = computed(() => this.stages().length);

  protected readonly terms = computed(() => {
    return this.stages()
      .flatMap((stage) =>
        (stage.terms ?? []).map((term) => ({
          stage,
          term,
        })),
      )
      .sort((a, b) => {
        const startA = this.parseDate(a.term.start_date).getTime();
        const startB = this.parseDate(b.term.start_date).getTime();

        return startA - startB;
      });
  });

  protected readonly termsTotal = computed(() => this.terms().length);

  protected readonly currentTerm = computed<IStudyPlanCurrentTerm | null>(() => {
    const today = this.startOfDay(new Date());
    const terms = this.terms();

    const current = terms.find(({ term }) => {
      const start = this.parseDate(term.start_date);
      const end = this.parseDate(term.end_date);

      return start <= today && today <= end;
    });

    if (current) {
      return { ...current, type: 'current' };
    }

    const next = terms.find(({ term }) => {
      const start = this.parseDate(term.start_date);

      return start > today;
    });

    if (next) {
      return { ...next, type: 'next' };
    }

    const last = terms.at(-1);

    return last ? { ...last, type: 'last' } : null;
  });

  protected readonly currentTermLabel = computed(() => {
    const current = this.currentTerm();

    if (!current) {
      return '';
    }

    return `${current.stage.name} · ${current.term.code}`;
  });

  protected readonly currentTermStatus = computed(() => {
    return this.currentTerm()?.term.status ?? null;
  });

  protected readonly currentTermStartDate = computed(() => {
    return this.currentTerm()?.term.start_date ?? null;
  });

  protected readonly currentTermEndDate = computed(() => {
    return this.currentTerm()?.term.end_date ?? null;
  });

  protected readonly daysToClose = computed(() => {
    const current = this.currentTerm();

    if (!current || current.type !== 'current') {
      return null;
    }

    const today = this.startOfDay(new Date());
    const end = this.parseDate(current.term.end_date);
    const diff = end.getTime() - today.getTime();

    return Math.max(0, Math.ceil(diff / 86_400_000));
  });

  protected readonly missingStagesCount = computed(() => {
    const expected = this.expectedStagesCount();

    if (!expected) {
      return 0;
    }

    return Math.max(expected - this.stagesCount(), 0);
  });

  protected readonly canAddStage = computed(() => {
    return !!this.addStageOption() && this.missingStagesCount() > 0;
  });

  protected readonly hasCompleteStages = computed(() => {
    const expected = this.expectedStagesCount();

    if (!expected) {
      return this.stagesCount() > 0;
    }

    return this.stagesCount() >= expected;
  });

  protected onAddStage(): void {
    this.addStage.emit();
  }

  protected onManage(stageId: number): void {
    this.stageSelected.emit(stageId);
  }

  private parseDate(value: string): Date {
    const datePart = value.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);

    return this.startOfDay(new Date(year, month - 1, day));
  }

  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }
}