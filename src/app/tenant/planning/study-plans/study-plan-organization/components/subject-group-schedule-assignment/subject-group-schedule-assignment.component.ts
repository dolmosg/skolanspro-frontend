import { Component, computed, effect, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import type { ISubject } from '@shared/interfaces/academics.interfaces';
import type { IDay } from '@shared/interfaces/central.interfaces';
import type { IBlockType } from '@shared/interfaces/configuration.interfaces';
import type {
  IStudyPlanScheduleBlock,
  IStudyPlanScheduleSegment,
  IStudyPlanScheduleStructure,
  IStudyPlanScheduleVariant,
  IStudyPlanStageGroup,
  IStudyPlanStageSubjectGroup,
  IStudyPlanStageSubjectGroupBlock,
} from '@shared/interfaces/study-plan-interfaces';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

import type { StudyPlanOrganizationSummariesPatch } from '../../study-plan-organization.component';
import type {
  StudyPlanAcademicAssignmentsGradeSubjectGroup,
  StudyPlanAcademicAssignmentsGradeSummary,
  StudyPlanAcademicAssignmentsGroupSummary,
  StudyPlanAcademicAssignmentsSubjectSummary,
} from '../study-plan-academic-assignments-grade-detail/study-plan-academic-assignments-grade-detail.component';

type ScheduleSubjectDto = Pick<ISubject, 'id' | 'name' | 'code' | 'weekly_blocks'>;

type ScheduleGroupDto = Pick<IStudyPlanStageGroup, 'id' | 'name' | 'code' | 'color'>;

type ScheduleAssignmentDto = Pick<IStudyPlanStageSubjectGroup, 'id' | 'stage_subject_id'> & {
  stage_group_id: IStudyPlanStageSubjectGroup['study_plan_stage_group_id'];
  subject: ScheduleSubjectDto | null;
  group: ScheduleGroupDto | null;
};

type ScheduleStructureDto = Pick<IStudyPlanScheduleStructure, 'id' | 'name' | 'active'>;

type ScheduleVariantDto = Pick<IStudyPlanScheduleVariant, 'id' | 'code' | 'name'>;

type ScheduleDayDto = Pick<IDay, 'id' | 'name' | 'translation' | 'order'>;

type ScheduleBlockTypeDto = Pick<IBlockType, 'id' | 'name' | 'translation'>;

type ScheduleBlockDto = Pick<
  IStudyPlanScheduleBlock,
  'id' | 'code' | 'name' | 'start' | 'end' | 'duration' | 'order'
> & {
  block_type: ScheduleBlockTypeDto | null;
};

type ScheduleSegmentDto = Pick<IStudyPlanScheduleSegment, 'name'> & {
  id: NonNullable<IStudyPlanScheduleSegment['id']>;
  order: NonNullable<IStudyPlanScheduleSegment['order']>;
  days: ScheduleDayDto[];
  blocks: ScheduleBlockDto[];
};

type ScheduleOccupancyDto = {
  id: NonNullable<IStudyPlanStageSubjectGroupBlock['id']>;
  schedule_block_id: IStudyPlanStageSubjectGroupBlock['study_plan_schedule_block_id'];
  day_id: IStudyPlanStageSubjectGroupBlock['day_id'];
  schedule_variant_id: IStudyPlanStageSubjectGroupBlock['study_plan_schedule_variant_id'];
};

type ScheduleCellMutationOccupancyDto = {
  id: ScheduleOccupancyDto['id'] | null;
  schedule_block_id: ScheduleOccupancyDto['schedule_block_id'];
  day_id: ScheduleOccupancyDto['day_id'];
  schedule_variant_id: ScheduleOccupancyDto['schedule_variant_id'];
  assigned: boolean;
};

export interface ScheduleCellMutationResponseDto {
  occupancy: ScheduleCellMutationOccupancyDto;
  changed: boolean;
  group_summary: StudyPlanAcademicAssignmentsGroupSummary;
  subject_summary: StudyPlanAcademicAssignmentsSubjectSummary;
  grade_summary: StudyPlanAcademicAssignmentsGradeSummary;
  organization_summaries: StudyPlanOrganizationSummariesPatch;
}

interface ScheduleCellMutationPayload {
  grade_id: number | null;
  occupancy_id: ScheduleOccupancyDto['id'] | null;
  schedule_block_id: ScheduleOccupancyDto['schedule_block_id'];
  day_id: ScheduleOccupancyDto['day_id'];
  schedule_variant_id: ScheduleOccupancyDto['schedule_variant_id'];
  assigned: boolean;
}

type ScheduleAssignmentResponseDto = {
  assignment: ScheduleAssignmentDto;
  structure: ScheduleStructureDto;
  uses_variant_selection: boolean;
  variants: ScheduleVariantDto[];
  segments: ScheduleSegmentDto[];
  occupancies: ScheduleOccupancyDto[];
};

@Component({
  selector: 'app-subject-group-schedule-assignment',
  imports: [TranslatePipe, UiButtonComponent],
  templateUrl: './subject-group-schedule-assignment.component.html',
  styleUrl: './subject-group-schedule-assignment.component.scss',
})
export class SubjectGroupScheduleAssignmentComponent extends SkolansBaseComponent {
  readonly route = input.required<string>();
  readonly stageId = input.required<number>();
  readonly gradeId = input<number | null>(null);
  readonly assignmentGroup = input.required<StudyPlanAcademicAssignmentsGradeSubjectGroup>();
  readonly close = output<void>();
  readonly scheduleMutation = output<ScheduleCellMutationResponseDto>();

  protected readonly schedule = signal<ScheduleAssignmentResponseDto | null>(null);
  protected readonly selectedVariantId = signal<number | null>(null);
  protected readonly pendingOccupancyKeys = signal<string[]>([]);
  protected readonly hasPendingRequests = computed(
    () => this.loading() || this.pendingOccupancyKeys().length > 0,
  );
  protected readonly occupancyIndex = computed(() => {
    return new Map(
      (this.schedule()?.occupancies ?? []).map((occupancy) => [
        this.occupancyKey(
          occupancy.schedule_variant_id,
          occupancy.schedule_block_id,
          occupancy.day_id,
        ),
        occupancy,
      ]),
    );
  });

  private readonly loadedKey = signal<string | null>(null);

  constructor() {
    super();

    effect(() => {
      const route = this.scheduleRoute();
      const loadKey = this.scheduleLoadKey();

      if (!route || !loadKey) {
        this.resetState();
        return;
      }

      if (this.loadedKey() === loadKey) {
        return;
      }

      this.loadedKey.set(loadKey);
      this.schedule.set(null);
      this.loadSchedule(route, loadKey);
    });
  }

  protected closeEditor(): void {
    if (this.hasPendingRequests()) {
      return;
    }

    this.close.emit();
  }

  protected setSelectedVariant(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    const variantId = Number(value);

    this.selectedVariantId.set(Number.isFinite(variantId) && variantId > 0 ? variantId : null);
  }

  protected isCellSelected(block: ScheduleBlockDto, day: ScheduleDayDto): boolean {
    const variantId = this.selectedVariantId();

    if (!variantId) {
      return false;
    }

    return this.occupancyIndex().has(this.occupancyKey(variantId, block.id, day.id));
  }

  protected isCellPending(block: ScheduleBlockDto, day: ScheduleDayDto): boolean {
    const variantId = this.selectedVariantId();

    if (!variantId) {
      return true;
    }

    return this.pendingOccupancyKeys().includes(this.occupancyKey(variantId, block.id, day.id));
  }

  protected toggleCell(block: ScheduleBlockDto, day: ScheduleDayDto): void {
    const route = this.scheduleBaseRoute();
    const schedule = this.schedule();
    const variantId = this.selectedVariantId();

    if (!route || !schedule || !variantId) {
      return;
    }

    const key = this.occupancyKey(variantId, block.id, day.id);

    if (this.pendingOccupancyKeys().includes(key)) {
      return;
    }

    const currentOccupancy = this.occupancyIndex().get(key) ?? null;
    const assigned = currentOccupancy === null;
    const previousOccupancies = [...schedule.occupancies];

    this.markCellPending(key);
    this.applyOptimisticOccupancy(
      schedule,
      key,
      {
        id: currentOccupancy?.id ?? 0,
        schedule_block_id: block.id,
        day_id: day.id,
        schedule_variant_id: variantId,
      },
      assigned,
    );

    const payload: ScheduleCellMutationPayload = {
      grade_id: this.gradeId(),
      occupancy_id: currentOccupancy?.id ?? null,
      schedule_block_id: block.id,
      day_id: day.id,
      schedule_variant_id: variantId,
      assigned,
    };

    this.api
      .patch<ScheduleCellMutationResponseDto>(route, payload, { loader: false })
      .subscribe({
        next: (res) => {
          if (this.handleApiFailure(res)) {
            this.restoreOccupancies(previousOccupancies);
            return;
          }

          this.reconcileOccupancy(key, res.data.occupancy);
          this.scheduleMutation.emit(res.data);
        },
        error: () => {
          this.restoreOccupancies(previousOccupancies);
          this.clearCellPending(key);
          this.ignoreHandledRequestError();
        },
        complete: () => this.clearCellPending(key),
      });
  }

  protected formatTime(value: string | null | undefined): string {
    if (!value) {
      return '--:--';
    }

    return value.slice(0, 5);
  }

  private loadSchedule(route: string, loadKey: string): void {
    this.executeSilentRequest<ScheduleAssignmentResponseDto>(
      this.api.get(route),
      (res) => {
        if (this.loadedKey() !== loadKey) {
          return;
        }

        this.schedule.set(res.data);
        this.selectedVariantId.set(res.data.variants[0]?.id ?? null);
      },
      () => {
        if (this.loadedKey() !== loadKey) {
          return;
        }

        this.schedule.set(null);
        this.selectedVariantId.set(null);
      },
    );
  }

  private scheduleRoute(): string | null {
    const baseRoute = this.scheduleBaseRoute();

    if (!baseRoute) {
      return null;
    }

    return `${baseRoute}?grade_id=${this.gradeIdQuery()}`;
  }

  private scheduleBaseRoute(): string | null {
    const baseRoute = this.route().trim();
    const stageId = this.stageId();
    const assignmentGroupId = this.assignmentGroup().id;

    if (!baseRoute || !stageId || !assignmentGroupId) {
      return null;
    }

    return `${baseRoute}/${stageId}/${assignmentGroupId}/schedule`;
  }

  private scheduleLoadKey(): string | null {
    const baseRoute = this.route().trim();
    const stageId = this.stageId();
    const assignmentGroupId = this.assignmentGroup().id;

    if (!baseRoute || !stageId || !assignmentGroupId) {
      return null;
    }

    return `${baseRoute}|${stageId}|${this.gradeId() ?? 'crossover'}|${assignmentGroupId}`;
  }

  private gradeIdQuery(): string {
    const gradeId = this.gradeId();

    return gradeId === null ? '' : encodeURIComponent(String(gradeId));
  }

  private resetState(): void {
    this.loadedKey.set(null);
    this.schedule.set(null);
    this.selectedVariantId.set(null);
    this.pendingOccupancyKeys.set([]);
  }

  private occupancyKey(variantId: number, blockId: number, dayId: number): string {
    return `${variantId}:${blockId}:${dayId}`;
  }

  private markCellPending(key: string): void {
    this.pendingOccupancyKeys.update((keys) => (keys.includes(key) ? keys : [...keys, key]));
  }

  private clearCellPending(key: string): void {
    this.pendingOccupancyKeys.update((keys) => keys.filter((currentKey) => currentKey !== key));
  }

  private applyOptimisticOccupancy(
    schedule: ScheduleAssignmentResponseDto,
    key: string,
    occupancy: ScheduleOccupancyDto,
    assigned: boolean,
  ): void {
    const nextOccupancies = assigned
      ? [
          ...schedule.occupancies.filter((current) => this.occupancyKeyFor(current) !== key),
          occupancy,
        ]
      : schedule.occupancies.filter((current) => this.occupancyKeyFor(current) !== key);

    this.schedule.set({
      ...schedule,
      occupancies: nextOccupancies,
    });
  }

  private reconcileOccupancy(
    key: string,
    occupancy: ScheduleCellMutationResponseDto['occupancy'],
  ): void {
    const schedule = this.schedule();

    if (!schedule) {
      return;
    }

    const occupancies = schedule.occupancies.filter(
      (current) => this.occupancyKeyFor(current) !== key,
    );

    if (!occupancy.assigned || occupancy.id === null) {
      this.schedule.set({
        ...schedule,
        occupancies,
      });
      return;
    }

    this.schedule.set({
      ...schedule,
      occupancies: [
        ...occupancies,
        {
          id: occupancy.id,
          schedule_block_id: occupancy.schedule_block_id,
          day_id: occupancy.day_id,
          schedule_variant_id: occupancy.schedule_variant_id,
        },
      ],
    });
  }

  private restoreOccupancies(occupancies: ScheduleOccupancyDto[]): void {
    const schedule = this.schedule();

    if (!schedule) {
      return;
    }

    this.schedule.set({
      ...schedule,
      occupancies,
    });
  }

  private occupancyKeyFor(occupancy: ScheduleOccupancyDto): string {
    return this.occupancyKey(
      occupancy.schedule_variant_id,
      occupancy.schedule_block_id,
      occupancy.day_id,
    );
  }
}
