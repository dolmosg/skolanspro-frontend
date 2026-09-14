import { ChangeDetectionStrategy, Component, OnInit, computed, input, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';

import type { StudyPlanReportCardItemDto } from '../../study-plan-report-cards.interfaces';
import type {
  GradebookAspectGradeDto,
  GradebookAspectDto,
  GradebookAspectsResponse,
  GradebookAspectsStageDto,
  GradebookAspectSubjectDto,
  GradebookSubjectAspectsResponse,
} from './gradebook-aspects.interfaces';

/**
 * Owns Grade → GradebookSubject navigation and report-card aspect selection.
 *
 * The selected identity is the gradebook-local subject id because aspect
 * visibility is configured through that assignment. Navigation and the current
 * subject's server-provided aspect state are local state. Each mutation consumes
 * the canonical subject response so the server remains the source of truth.
 */
@Component({
  selector: 'app-gradebook-aspects',
  imports: [TranslatePipe, UiIconComponent],
  templateUrl: './gradebook-aspects.component.html',
  styleUrl: './gradebook-aspects.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GradebookAspectsComponent extends SkolansBaseComponent implements OnInit {
  readonly gradebook = input.required<StudyPlanReportCardItemDto>();
  readonly studyPlanId = input.required<number>();
  readonly route = input.required<string>();

  protected readonly stage = signal<GradebookAspectsStageDto | null>(null);
  protected readonly grades = signal<GradebookAspectGradeDto[]>([]);
  protected readonly crossovers = signal<GradebookAspectSubjectDto[]>([]);
  protected readonly selectedGradebookSubjectId = signal<number | null>(null);
  protected readonly aspects = signal<GradebookAspectDto[]>([]);
  protected readonly aspectsLoading = signal(false);
  protected readonly loaded = signal(false);
  private readonly updatingAspectKeys = signal<Set<string>>(new Set());

  private aspectsRequestSequence = 0;

  protected readonly selectedSubject = computed(() => {
    const selectedId = this.selectedGradebookSubjectId();

    if (selectedId === null) {
      return null;
    }

    return (
      this.grades()
        .flatMap((grade) => grade.subjects)
        .find((subject) => subject.id === selectedId) ??
      this.crossovers().find((subject) => subject.id === selectedId) ??
      null
    );
  });

  ngOnInit(): void {
    this.loadAspectsNavigation();
  }

  protected selectSubject(gradebookSubjectId: number): void {
    if (this.selectedGradebookSubjectId() === gradebookSubjectId) {
      return;
    }

    this.selectedGradebookSubjectId.set(gradebookSubjectId);
    this.loadSubjectAspects(gradebookSubjectId);
  }

  protected isSelectedSubject(gradebookSubjectId: number): boolean {
    return this.selectedGradebookSubjectId() === gradebookSubjectId;
  }

  protected isAspectUpdating(aspectId: number): boolean {
    const gradebookSubjectId = this.selectedGradebookSubjectId();

    return (
      gradebookSubjectId !== null &&
      this.updatingAspectKeys().has(this.aspectUpdateKey(gradebookSubjectId, aspectId))
    );
  }

  protected toggleAspect(aspect: GradebookAspectDto): void {
    const gradebookSubjectId = this.selectedGradebookSubjectId();

    if (gradebookSubjectId === null || this.isAspectUpdating(aspect.id)) {
      return;
    }

    const updateKey = this.aspectUpdateKey(gradebookSubjectId, aspect.id);
    const requestSequence = this.aspectsRequestSequence;
    const route = `${this.route()}/${this.studyPlanId()}/${this.gradebook().id}/${gradebookSubjectId}`;
    const request = aspect.selected
      ? this.api.delete<GradebookSubjectAspectsResponse>(`${route}/${aspect.id}`, { loader: false })
      : this.api.post<GradebookSubjectAspectsResponse>(
          route,
          { study_plan_aspect_id: aspect.id },
          { loader: false },
        );

    this.updatingAspectKeys.update((current) => new Set(current).add(updateKey));

    this.executeMutationRequest<GradebookSubjectAspectsResponse>(
      request,
      (response) => {
        if (
          requestSequence !== this.aspectsRequestSequence ||
          this.selectedGradebookSubjectId() !== gradebookSubjectId
        ) {
          return;
        }

        this.aspects.set(response.data.aspects);
        this.setScreenOptions(response.data.options);
      },
      () => {
        this.updatingAspectKeys.update((current) => {
          const next = new Set(current);
          next.delete(updateKey);
          return next;
        });
      },
    );
  }

  private loadAspectsNavigation(): void {
    this.loaded.set(false);

    this.executeSilentRequest<GradebookAspectsResponse>(
      this.api.get(`${this.route()}/${this.studyPlanId()}/${this.gradebook().id}`),
      (response) => {
        this.stage.set(response.data.stage);
        this.grades.set(response.data.grades);
        this.crossovers.set(response.data.crossovers);
        this.setScreenOptions(response.data.options);
        const initialGradebookSubjectId =
          response.data.grades.flatMap((grade) => grade.subjects)[0]?.id ??
            response.data.crossovers[0]?.id ??
            null;

        this.selectedGradebookSubjectId.set(initialGradebookSubjectId);

        if (initialGradebookSubjectId === null) {
          this.clearSubjectAspects();
        } else {
          this.loadSubjectAspects(initialGradebookSubjectId);
        }

        this.loaded.set(true);
      },
    );
  }

  private loadSubjectAspects(gradebookSubjectId: number): void {
    const requestSequence = ++this.aspectsRequestSequence;
    this.aspects.set([]);
    this.aspectsLoading.set(true);

    this.executeSilentRequest<GradebookSubjectAspectsResponse>(
      this.api.get(
        `${this.route()}/${this.studyPlanId()}/${this.gradebook().id}/${gradebookSubjectId}`,
        { loader: false },
      ),
      (response) => {
        if (
          requestSequence !== this.aspectsRequestSequence ||
          this.selectedGradebookSubjectId() !== gradebookSubjectId
        ) {
          return;
        }

        this.aspects.set(response.data.aspects);
        this.setScreenOptions(response.data.options);
      },
      () => {
        if (requestSequence === this.aspectsRequestSequence) {
          this.aspects.set([]);
        }
      },
      () => {
        if (requestSequence === this.aspectsRequestSequence) {
          this.aspectsLoading.set(false);
        }
      },
    );
  }

  private clearSubjectAspects(): void {
    this.aspectsRequestSequence++;
    this.aspects.set([]);
    this.aspectsLoading.set(false);
  }

  private aspectUpdateKey(gradebookSubjectId: number, aspectId: number): string {
    return `${gradebookSubjectId}:${aspectId}`;
  }
}
