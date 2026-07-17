import { Component, computed, effect, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

import type {
  StudyPlanAcademicAssignmentsGradeSubjectGroup,
  StudyPlanAcademicAssignmentsGradeSummary,
  StudyPlanAcademicAssignmentsGroupSummary,
  StudyPlanAcademicAssignmentsSubjectSummary,
} from '../study-plan-academic-assignments-grade-detail/study-plan-academic-assignments-grade-detail.component';
import type { StudyPlanOrganizationSummariesPatch } from '../../study-plan-organization.component';

type ReportCardOfficialOverride = boolean | null;
type ReportCardOfficialOverrideOption = 'automatic' | 'yes' | 'no';

interface SubjectGroupOptionsResponsePayload {
  summary: StudyPlanAcademicAssignmentsGroupSummary;
  group_summary: StudyPlanAcademicAssignmentsGroupSummary;
  subject_summary: StudyPlanAcademicAssignmentsSubjectSummary;
  grade_summary: StudyPlanAcademicAssignmentsGradeSummary;
  organization_summaries: StudyPlanOrganizationSummariesPatch;
}

interface SubjectGroupOptionsSavePayload {
  grade_id: number | null;
  grade_capture_enabled: boolean;
  report_card_official_override: ReportCardOfficialOverride;
}

export interface SubjectGroupOptionsSavedPayload extends SubjectGroupOptionsResponsePayload {
  grade_capture_enabled: boolean;
  report_card_official_override: ReportCardOfficialOverride;
}

@Component({
  selector: 'app-subject-group-options-editor',
  imports: [TranslatePipe, UiButtonComponent],
  templateUrl: './subject-group-options-editor.component.html',
  styleUrl: './subject-group-options-editor.component.scss',
})
export class SubjectGroupOptionsEditorComponent extends SkolansBaseComponent {
  readonly route = input.required<string>();
  readonly stageId = input.required<number>();
  readonly gradeId = input<number | null>(null);
  readonly assignmentGroup = input.required<StudyPlanAcademicAssignmentsGradeSubjectGroup>();
  readonly saved = output<SubjectGroupOptionsSavedPayload>();
  readonly close = output<void>();

  protected readonly gradeCaptureEnabled = signal(true);
  protected readonly reportCardOfficialOverride = signal<ReportCardOfficialOverride>(null);
  protected readonly initialStateKey = signal('');
  protected readonly reportCardOptions: {
    value: ReportCardOfficialOverrideOption;
    translation: string;
  }[] = [
    {
      value: 'automatic',
      translation:
        'planning.study-plan-organizations.academic-assignments.options-editor.automatic',
    },
    {
      value: 'yes',
      translation: 'planning.study-plan-organizations.academic-assignments.options-editor.yes',
    },
    {
      value: 'no',
      translation: 'planning.study-plan-organizations.academic-assignments.options-editor.no',
    },
  ];
  protected readonly hasChanges = computed(() => {
    return (
      this.stateKey(this.gradeCaptureEnabled(), this.reportCardOfficialOverride()) !==
      this.initialStateKey()
    );
  });
  protected readonly selectedReportCardOption = computed<ReportCardOfficialOverrideOption>(() => {
    const value = this.reportCardOfficialOverride();

    if (value === true) {
      return 'yes';
    }

    if (value === false) {
      return 'no';
    }

    return 'automatic';
  });

  constructor() {
    super();

    effect(() => {
      const assignmentGroup = this.assignmentGroup();
      const gradeCaptureEnabled = assignmentGroup.grade_capture_enabled ?? true;
      const reportCardOfficialOverride =
        assignmentGroup.report_card_official_override ?? null;

      this.gradeCaptureEnabled.set(gradeCaptureEnabled);
      this.reportCardOfficialOverride.set(reportCardOfficialOverride);
      this.initialStateKey.set(
        this.stateKey(gradeCaptureEnabled, reportCardOfficialOverride),
      );
    });
  }

  protected setGradeCaptureEnabled(event: Event): void {
    const target = event.target as HTMLInputElement | null;

    this.gradeCaptureEnabled.set(target?.checked ?? false);
  }

  protected selectReportCardOption(option: ReportCardOfficialOverrideOption): void {
    this.reportCardOfficialOverride.set(this.reportCardOptionValue(option));
  }

  protected saveOptions(): void {
    const route = this.saveOptionsRoute();

    if (!route || this.loading() || !this.hasChanges()) {
      return;
    }

    const payload = this.savePayload();

    this.executeSilentRequest<SubjectGroupOptionsResponsePayload>(
      this.api.put(route, payload),
      (res) => {
        this.toast.success(
          this.translate.instant(
            'planning.study-plan-organizations.academic-assignments.options-editor.success',
          ),
        );
        this.initialStateKey.set(
          this.stateKey(payload.grade_capture_enabled, payload.report_card_official_override),
        );
        this.saved.emit({
          ...res.data,
          grade_capture_enabled: payload.grade_capture_enabled,
          report_card_official_override: payload.report_card_official_override,
        });
      },
    );
  }

  protected closeEditor(): void {
    if (this.loading()) {
      return;
    }

    this.close.emit();
  }

  private saveOptionsRoute(): string | null {
    const baseRoute = this.route().trim();
    const stageId = this.stageId();
    const assignmentGroupId = this.assignmentGroup().id;

    if (!baseRoute || !stageId || !assignmentGroupId) {
      return null;
    }

    return `${baseRoute}/${stageId}/${assignmentGroupId}/options`;
  }

  private savePayload(): SubjectGroupOptionsSavePayload {
    return {
      grade_id: this.gradeId(),
      grade_capture_enabled: this.gradeCaptureEnabled(),
      report_card_official_override: this.reportCardOfficialOverride(),
    };
  }

  private reportCardOptionValue(
    option: ReportCardOfficialOverrideOption,
  ): ReportCardOfficialOverride {
    if (option === 'yes') {
      return true;
    }

    if (option === 'no') {
      return false;
    }

    return null;
  }

  private stateKey(
    gradeCaptureEnabled: boolean,
    reportCardOfficialOverride: ReportCardOfficialOverride,
  ): string {
    return `${gradeCaptureEnabled ? '1' : '0'}:${
      reportCardOfficialOverride === null ? 'auto' : reportCardOfficialOverride ? 'yes' : 'no'
    }`;
  }
}
