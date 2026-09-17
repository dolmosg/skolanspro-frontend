import { ChangeDetectionStrategy, Component, computed, effect, input, signal, untracked } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import type { ScreenChildItem } from '@shared/interfaces/access.interfaces';
import type { IRubric } from '@shared/interfaces/planning.interfaces';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

import type {
  RubricAssignmentGroup,
  RubricAssignmentGroupsMutationDto,
  RubricAssignmentSection,
  RubricAssignmentStageSubject,
  RubricAssignmentSubjectsDto,
  RubricAssignmentsIndexDto,
} from '../../rubrics.interfaces';

type RubricAssignmentsDetailState =
  | {
      mode: 'subjects';
      rubricSectionId: number;
    }
  | null;

/**
 * Displays the canonical read-only assignment context for one rubric.
 *
 * Groups and Sections remain in backend order. Group selection is replaced
 * only from the canonical mutation response; Section Subjects are visual only.
 */
@Component({
  selector: 'app-rubric-assignments',
  imports: [TranslatePipe, UiButtonComponent],
  templateUrl: './rubric-assignments.component.html',
  styleUrl: './rubric-assignments.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RubricAssignmentsComponent extends SkolansBaseComponent {
  readonly rubric = input.required<IRubric>();
  readonly child = input.required<ScreenChildItem>();

  protected readonly groups = signal<RubricAssignmentGroup[]>([]);
  protected readonly sections = signal<RubricAssignmentSection[]>([]);
  protected readonly loaded = signal(false);
  protected readonly hasSelectedGroups = computed(() => this.groups().some((group) => group.selected));
  protected readonly detailState = signal<RubricAssignmentsDetailState>(null);
  protected readonly subjects = signal<RubricAssignmentStageSubject[]>([]);
  protected readonly selectedSubjectIds = signal<Set<number>>(new Set());
  protected readonly subjectsLoaded = signal(false);
  protected readonly subjectSection = computed(() => {
    const detailState = this.detailState();

    return detailState?.mode === 'subjects'
      ? (this.sections().find((section) => section.id === detailState.rubricSectionId) ?? null)
      : null;
  });

  private contextKey: string | null = null;
  private requestToken = 0;
  private subjectsRequestToken = 0;

  constructor() {
    super();

    effect(() => {
      const rubricId = this.rubric().id;
      const route = this.child().route;

      untracked(() => this.loadAssignments(rubricId, route));
    });
  }

  protected toggleGroup(group: RubricAssignmentGroup, event: Event): void {
    const route = this.child().route;

    if (
      !route ||
      !this.getScreenOption('update-groups') ||
      this.detailState() !== null ||
      this.loading()
    ) {
      return;
    }

    const rubricId = this.rubric().id;
    const contextKey = `${route}/${rubricId}`;
    const checkbox = event.target as HTMLInputElement;
    const checked = checkbox.checked;
    const groupIds = this.groups()
      .filter((item) => (item.id === group.id ? checked : item.selected))
      .map((item) => item.id);

    checkbox.checked = group.selected;

    this.executeMutationRequest<RubricAssignmentGroupsMutationDto>(
      this.api.put(`${contextKey}/groups`, { group_ids: groupIds }),
      (response) => {
        if (this.rubric().id !== rubricId || this.contextKey !== contextKey) {
          return;
        }

        this.groups.set(response.data.groups);
      },
    );
  }

  protected openSubjects(section: RubricAssignmentSection): void {
    const route = this.child().route;

    if (
      !route ||
      !this.getScreenOption('update-subjects') ||
      !this.hasSelectedGroups() ||
      this.loading()
    ) {
      return;
    }

    const rubricId = this.rubric().id;
    const contextKey = `${route}/${rubricId}`;
    const requestToken = ++this.subjectsRequestToken;

    this.detailState.set({ mode: 'subjects', rubricSectionId: section.id });
    this.subjects.set([]);
    this.selectedSubjectIds.set(new Set());
    this.subjectsLoaded.set(false);

    this.executeSilentRequest<RubricAssignmentSubjectsDto>(
      this.api.get(`${contextKey}/sections/${section.id}/subjects`),
      (response) => {
        if (!this.isCurrentSubjectsContext(contextKey, section.id, requestToken)) {
          return;
        }

        this.subjects.set(response.data.stage_subjects);
        this.selectedSubjectIds.set(
          new Set(
            response.data.stage_subjects
              .filter((stageSubject) => stageSubject.selected)
              .map((stageSubject) => stageSubject.id),
          ),
        );
      },
      undefined,
      () => {
        if (this.isCurrentSubjectsContext(contextKey, section.id, requestToken)) {
          this.subjectsLoaded.set(true);
        }
      },
    );
  }

  protected toggleSubject(stageSubjectId: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;

    this.selectedSubjectIds.update((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(stageSubjectId);
      } else {
        next.delete(stageSubjectId);
      }

      return next;
    });
  }

  protected cancelSubjects(): void {
    this.resetSubjectsDetail();
  }

  protected saveSubjects(): void {
    const route = this.child().route;
    const detailState = this.detailState();

    if (
      !route ||
      detailState?.mode !== 'subjects' ||
      !this.getScreenOption('update-subjects') ||
      !this.subjectsLoaded() ||
      this.loading()
    ) {
      return;
    }

    const rubricId = this.rubric().id;
    const sectionId = detailState.rubricSectionId;
    const contextKey = `${route}/${rubricId}`;
    const selectedIds = this.selectedSubjectIds();
    const stageSubjectIds = this.subjects()
      .filter((stageSubject) => selectedIds.has(stageSubject.id))
      .map((stageSubject) => stageSubject.id);

    this.executeMutationRequest<RubricAssignmentSubjectsDto>(
      this.api.put(`${contextKey}/sections/${sectionId}/subjects`, {
        stage_subject_ids: stageSubjectIds,
      }),
      (response) => {
        if (
          this.contextKey !== contextKey ||
          this.detailState()?.rubricSectionId !== sectionId
        ) {
          return;
        }

        this.subjects.set(response.data.stage_subjects);
        this.selectedSubjectIds.set(
          new Set(
            response.data.stage_subjects
              .filter((stageSubject) => stageSubject.selected)
              .map((stageSubject) => stageSubject.id),
          ),
        );
        this.sections.update((sections) =>
          sections.map((section) =>
            section.id === response.data.rubric_section.id
              ? {
                  ...section,
                  stage_subjects_count: response.data.rubric_section.stage_subjects_count,
                }
              : section,
          ),
        );
        this.resetSubjectsDetail();
      },
    );
  }

  private loadAssignments(rubricId: number, route: string | undefined): void {
    const contextKey = route ? `${route}/${rubricId}` : null;

    if (!contextKey || contextKey === this.contextKey) {
      return;
    }

    this.contextKey = contextKey;
    const requestToken = ++this.requestToken;

    this.resetSubjectsDetail();
    this.loaded.set(false);
    this.groups.set([]);
    this.sections.set([]);
    this.setScreenOptions([]);

    this.executeSilentRequest<RubricAssignmentsIndexDto>(this.api.get(contextKey), (response) => {
      if (requestToken !== this.requestToken || this.contextKey !== contextKey) {
        return;
      }

      this.groups.set(response.data.groups);
      this.sections.set(response.data.rubric_sections);
      this.setScreenOptions(response.data.options);
      this.loaded.set(true);
    });
  }

  private resetSubjectsDetail(): void {
    this.subjectsRequestToken++;
    this.detailState.set(null);
    this.subjects.set([]);
    this.selectedSubjectIds.set(new Set());
    this.subjectsLoaded.set(false);
  }

  private isCurrentSubjectsContext(
    contextKey: string,
    rubricSectionId: number,
    requestToken: number,
  ): boolean {
    return (
      this.contextKey === contextKey &&
      this.subjectsRequestToken === requestToken &&
      this.detailState()?.rubricSectionId === rubricSectionId
    );
  }
}
