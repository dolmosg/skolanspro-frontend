import { Component, computed, effect, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

import type {
  StudyPlanAcademicAssignmentsGradeSubject,
  StudyPlanAcademicAssignmentsTeamsMutationResult,
  StudyPlanAcademicAssignmentsTeamsResponse,
} from '../study-plan-academic-assignments-grade-detail/study-plan-academic-assignments-grade-detail.component';

export type TeamNumberingType = 'alphabetic' | 'numeric';

export interface StudyPlanAcademicAssignmentsStoreTeamsRequest {
  numbering_type: TeamNumberingType;
  groups: Array<{
    group_id: number;
    quantity: number;
  }>;
}

interface TeamGroupDraft {
  groupId: number;
  requestedQuantity: number;
}

@Component({
  selector: 'app-subject-teams-assignment',
  imports: [TranslatePipe, UiButtonComponent],
  templateUrl: './subject-teams-assignment.component.html',
  styleUrl: './subject-teams-assignment.component.scss',
})
export class SubjectTeamsAssignmentComponent extends SkolansBaseComponent {
  readonly route = input.required<string>();
  readonly stageId = input.required<number>();
  readonly gradeId = input.required<number>();
  readonly subject = input.required<StudyPlanAcademicAssignmentsGradeSubject>();
  readonly close = output<void>();
  readonly saved = output<StudyPlanAcademicAssignmentsTeamsMutationResult>();

  protected readonly teamsConfiguration =
    signal<StudyPlanAcademicAssignmentsTeamsResponse | null>(null);
  protected readonly saving = signal(false);
  protected readonly numberingType = signal<TeamNumberingType | null>('alphabetic');
  protected readonly groupDrafts = signal<TeamGroupDraft[]>([]);
  protected readonly requestedTeamsCount = computed(() =>
    this.groupDrafts().reduce((total, item) => total + item.requestedQuantity, 0),
  );
  protected readonly hasReduction = computed(() => {
    const configuration = this.teamsConfiguration();

    if (!configuration) {
      return false;
    }

    return configuration.groups.some(
      (group) => this.groupQuantity(group.id) < group.teams_count,
    );
  });
  protected readonly canSave = computed(() => {
    const configuration = this.teamsConfiguration();
    const drafts = this.groupDrafts();

    return Boolean(
      !this.loading() &&
        !this.saving() &&
        configuration &&
        this.numberingType() !== null &&
        configuration.groups.length > 0 &&
        !this.hasReduction() &&
        drafts.length === configuration.groups.length &&
        drafts.every(
          (draft) =>
            Number.isInteger(draft.requestedQuantity) &&
            draft.requestedQuantity >= 0 &&
            configuration.groups.some((group) => group.id === draft.groupId),
        ),
    );
  });

  private readonly loadedKey = signal<string | null>(null);

  constructor() {
    super();

    effect(() => {
      const route = this.teamsRoute();

      if (!route) {
        this.resetState();
        return;
      }

      if (this.loadedKey() === route) {
        return;
      }

      this.loadedKey.set(route);
      this.teamsConfiguration.set(null);
      this.groupDrafts.set([]);
      this.numberingType.set(null);
      this.loadTeams(route);
    });
  }

  protected closeEditor(): void {
    if (this.saving()) {
      return;
    }

    this.close.emit();
  }

  protected selectNumberingType(numberingType: TeamNumberingType): void {
    if (this.saving()) {
      return;
    }

    this.numberingType.set(numberingType);
  }

  protected groupQuantity(groupId: number): number {
    return this.groupDrafts().find((draft) => draft.groupId === groupId)?.requestedQuantity ?? 0;
  }

  protected updateGroupQuantity(groupId: number, value: number | null): void {
    if (this.saving()) {
      return;
    }

    const requestedQuantity =
      value !== null && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;

    this.groupDrafts.update((drafts) =>
      drafts.map((draft) =>
        draft.groupId === groupId ? { ...draft, requestedQuantity } : draft,
      ),
    );
  }

  protected groupHasReduction(groupId: number): boolean {
    const group = this.teamsConfiguration()?.groups.find((item) => item.id === groupId);

    return group ? this.groupQuantity(groupId) < group.teams_count : false;
  }

  protected saveTeams(): void {
    const route = this.teamsRoute();
    const numberingType = this.numberingType();

    if (!route || !numberingType || !this.canSave()) {
      return;
    }

    this.saving.set(true);
    this.executeMutationRequest<StudyPlanAcademicAssignmentsTeamsMutationResult>(
      this.api.post(route, this.buildStoreTeamsPayload(numberingType)),
      (res) => {
        const configuration: StudyPlanAcademicAssignmentsTeamsResponse = {
          numbering_type: res.data.numbering_type,
          subject: res.data.subject,
          groups: res.data.groups,
        };

        this.teamsConfiguration.set(configuration);
        this.initializeDrafts(configuration);
        this.saved.emit(res.data);
        this.close.emit();
      },
      () => this.saving.set(false),
    );
  }

  private loadTeams(route: string): void {
    this.executeSilentRequest<StudyPlanAcademicAssignmentsTeamsResponse>(
      this.api.get(route),
      (res) => {
        if (this.loadedKey() !== route) {
          return;
        }

        this.teamsConfiguration.set(res.data);
        this.initializeDrafts(res.data);
      },
      () => {
        if (this.loadedKey() !== route) {
          return;
        }

        this.teamsConfiguration.set(null);
        this.groupDrafts.set([]);
      },
    );
  }

  private teamsRoute(): string | null {
    const baseRoute = this.route().trim();
    const stageId = this.stageId();
    const subjectId = this.subject().id;
    const gradeId = this.gradeId();

    if (!baseRoute || !stageId || !subjectId || !gradeId) {
      return null;
    }

    return `${baseRoute}/${stageId}/subjects/${subjectId}/teams?grade_id=${encodeURIComponent(
      String(gradeId),
    )}`;
  }

  private initializeDrafts(configuration: StudyPlanAcademicAssignmentsTeamsResponse): void {
    this.numberingType.set(configuration.numbering_type);
    this.groupDrafts.set(
      configuration.groups.map((group) => ({
        groupId: group.id,
        requestedQuantity: group.teams_count,
      })),
    );
  }

  private buildStoreTeamsPayload(
    numberingType: TeamNumberingType,
  ): StudyPlanAcademicAssignmentsStoreTeamsRequest {
    return {
      numbering_type: numberingType,
      groups: this.groupDrafts().map((draft) => ({
        group_id: draft.groupId,
        quantity: draft.requestedQuantity,
      })),
    };
  }

  private resetState(): void {
    this.loadedKey.set(null);
    this.teamsConfiguration.set(null);
    this.groupDrafts.set([]);
    this.numberingType.set('alphabetic');
    this.saving.set(false);
  }
}
