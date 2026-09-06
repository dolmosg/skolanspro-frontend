import {
  CdkDrag,
  CdkDragDrop,
  CdkDragMove,
  CdkDropList,
  DragDropModule,
} from '@angular/cdk/drag-drop';
import { DOCUMENT } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import type { ISubject } from '@shared/interfaces/academics.interfaces';
import type { IDay } from '@shared/interfaces/central.interfaces';
import type { IBlockType, ISubjectType } from '@shared/interfaces/configuration.interfaces';
import type {
  IStudyPlanScheduleBlock,
  IStudyPlanScheduleSegment,
  IStudyPlanScheduleVariant,
  IStudyPlanStageGroup,
  IStudyPlanStageSubjectGroup,
  IStudyPlanStageSubjectGroupBlock,
} from '@shared/interfaces/study-plan-interfaces';
import { SkSelectComponent } from '@shared/ui/sk-select/sk-select.component';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import type { ScreenOptionItem } from '@shared/interfaces/access.interfaces';

import type { StudyPlanSchedulesSummary } from '../../study-plan-organization.component';

const NORMAL_GROUP_TYPE_ID = 1;

type StudyPlanScheduleSegmentSummary = Pick<IStudyPlanScheduleSegment, 'name' | 'active'> & {
  id: NonNullable<IStudyPlanScheduleSegment['id']>;
  order: NonNullable<IStudyPlanScheduleSegment['order']>;
};

type StudyPlanScheduleGroupSummary = Pick<
  IStudyPlanStageGroup,
  'id' | 'group_type_id' | 'name' | 'code' | 'color'
>;
type StudyPlanScheduleTeam = StudyPlanScheduleGroupSummary & {
  parent_id: NonNullable<IStudyPlanStageGroup['parent_id']>;
};
type StudyPlanScheduleSubject = Pick<ISubject, 'id' | 'name' | 'code' | 'weekly_blocks'>;
type StudyPlanScheduleSubjectType = Pick<ISubjectType, 'name' | 'uses_teams'>;

interface StudyPlanScheduleAssignment {
  id: NonNullable<IStudyPlanStageSubjectGroup['id']>;
  stage_subject_id: IStudyPlanStageSubjectGroup['stage_subject_id'];
  stage_group_id: IStudyPlanStageSubjectGroup['study_plan_stage_group_id'];
  subject: StudyPlanScheduleSubject | null;
  subject_type: StudyPlanScheduleSubjectType | null;
  team: StudyPlanScheduleTeam | null;
}

interface StudyPlanScheduleGroup extends StudyPlanScheduleGroupSummary {
  assignments: StudyPlanScheduleAssignment[];
}

interface StudyPlanScheduleGroupOption {
  id: number | null;
  label: string;
}

interface StudyPlanScheduleContext {
  segments: StudyPlanScheduleSegmentSummary[];
  groups: StudyPlanScheduleGroup[];
}

type StudyPlanScheduleDay = Pick<IDay, 'id' | 'name' | 'translation' | 'order'>;
type StudyPlanScheduleBlockType = Pick<IBlockType, 'id' | 'name' | 'translation'>;
type StudyPlanScheduleBlock = Pick<
  IStudyPlanScheduleBlock,
  'id' | 'code' | 'name' | 'start' | 'end' | 'duration' | 'order'
> & {
  block_type: StudyPlanScheduleBlockType | null;
};

interface StudyPlanScheduleSegment extends StudyPlanScheduleSegmentSummary {
  days: StudyPlanScheduleDay[];
  blocks: StudyPlanScheduleBlock[];
}

type StudyPlanScheduleVariant = Pick<IStudyPlanScheduleVariant, 'id' | 'code' | 'name'>;

interface StudyPlanScheduleOccupancy {
  id: NonNullable<IStudyPlanStageSubjectGroupBlock['id']>;
  assignment_id: NonNullable<IStudyPlanStageSubjectGroup['id']>;
  schedule_block_id: IStudyPlanStageSubjectGroupBlock['study_plan_schedule_block_id'];
  day_id: IStudyPlanStageSubjectGroupBlock['day_id'];
  schedule_variant_id: IStudyPlanStageSubjectGroupBlock['study_plan_schedule_variant_id'];
}

interface StudyPlanSegmentSchedule {
  segment: StudyPlanScheduleSegment;
  uses_variant_selection: boolean;
  variants: StudyPlanScheduleVariant[];
  occupancies: StudyPlanScheduleOccupancy[];
}

interface StudyPlanScheduleCellItem {
  occupancy: StudyPlanScheduleOccupancy;
  assignment: StudyPlanScheduleAssignment;
  group: StudyPlanScheduleGroup;
}

interface StudyPlanScheduleDropCell {
  blockId: number;
  dayId: number;
}

interface StudyPlanScheduleOccupancyPayload {
  grade_id: number;
  assignment_id: number;
  segment_id: number;
  schedule_block_id: number;
  day_id: number;
  schedule_variant_id: number;
}

interface StudyPlanScheduleOccupancyMovePayload {
  grade_id: number;
  segment_id: number;
  schedule_block_id: number;
  day_id: number;
  schedule_variant_id: number;
}

type StudyPlanScheduleDragData =
  | {
      type: 'assignment';
      assignment: StudyPlanScheduleAssignment;
    }
  | {
      type: 'occupancy';
      occupancy: StudyPlanScheduleOccupancy;
      assignment: StudyPlanScheduleAssignment;
    };

@Component({
  selector: 'app-study-plan-schedules-view',
  imports: [
    DragDropModule,
    ReactiveFormsModule,
    TranslatePipe,
    SkSelectComponent,
    UiButtonComponent,
  ],
  templateUrl: './study-plan-schedules-view.component.html',
  styleUrl: './study-plan-schedules-view.component.scss',
})
export class StudyPlanSchedulesViewComponent extends SkolansBaseComponent {
  private readonly document = inject(DOCUMENT);

  readonly route = input<string | null>(null);
  readonly screenOptions = input<ScreenOptionItem[]>([]);
  readonly summary = input.required<StudyPlanSchedulesSummary | null>();
  readonly stageId = input.required<number | null>();
  readonly gradeId = input.required<number | null>();
  readonly back = output<void>();

  private readonly selectedStageId = signal<number | null>(null);
  private readonly selectedGradeId = signal<number | null>(null);
  private readonly loadedContextKey = signal<string | null>(null);
  private readonly segmentRequestKey = signal<string | null>(null);

  protected readonly context = signal<StudyPlanScheduleContext | null>(null);
  protected readonly selectedSegmentId = signal<number | null>(null);
  protected readonly selectedGroupId = signal<number | null>(null);
  protected readonly segmentSchedule = signal<StudyPlanSegmentSchedule | null>(null);
  protected readonly selectedVariantId = signal<number | null>(null);
  protected readonly loadingContext = signal(false);
  protected readonly loadingSegment = signal(false);
  protected readonly scheduleOperationPending = signal(false);
  protected readonly activeDropCell = signal<StudyPlanScheduleDropCell | null>(null);
  protected readonly segmentControl = new FormControl<number | null>(null);
  protected readonly groupControl = new FormControl<number | null>(null);
  protected readonly variantControl = new FormControl<number | null>(null);

  protected readonly stages = computed(() => this.summary()?.items ?? []);
  protected readonly segments = computed(() => this.context()?.segments ?? []);
  protected readonly groups = computed(() => this.context()?.groups ?? []);
  protected readonly deleteOption = computed(() => this.getScreenOption('delete'));
  protected readonly orderedGroups = computed(() => {
    const groups = this.groups();

    return [
      ...groups.filter((group) => group.group_type_id === NORMAL_GROUP_TYPE_ID),
      ...groups.filter((group) => group.group_type_id !== NORMAL_GROUP_TYPE_ID),
    ];
  });
  protected readonly groupOptions = computed<StudyPlanScheduleGroupOption[]>(() => [
    {
      id: null,
      label: this.translate.instant(
        'planning.study-plan-organizations.schedules.workspace.all-groups',
      ),
    },
    ...this.orderedGroups().map((group) => ({
      id: group.id,
      label: group.code ? `${group.name} (${group.code})` : group.name,
    })),
  ]);
  protected readonly visibleGroups = computed(() => {
    const groupId = this.selectedGroupId();
    return groupId === null
      ? this.orderedGroups()
      : this.orderedGroups().filter((group) => group.id === groupId);
  });
  protected readonly visibleAssignments = computed(() =>
    this.visibleGroups().flatMap((group) => group.assignments),
  );
  protected readonly selectedStage = computed(() => {
    const stageId = this.selectedStageId();
    return stageId === null ? null : (this.stages().find((stage) => stage.id === stageId) ?? null);
  });
  protected readonly selectedGrade = computed(() => {
    const stage = this.selectedStage();
    const gradeId = this.selectedGradeId();

    return !stage || gradeId === null
      ? null
      : (stage.grades.find((grade) => grade.type === 'grade' && grade.id === gradeId) ?? null);
  });
  protected readonly selectedTitle = computed(() => this.selectedGrade()?.name ?? 'common.no-data');
  protected readonly selectedDescription = computed(() => this.selectedGrade()?.description ?? '');
  protected readonly selectedSegment = computed(() => {
    const segmentId = this.selectedSegmentId();
    return this.segments().find((segment) => segment.id === segmentId) ?? null;
  });
  protected readonly showVariantSelector = computed(() => {
    const schedule = this.segmentSchedule();
    return !!schedule?.uses_variant_selection && schedule.variants.length > 1;
  });
  protected readonly assignmentById = computed(() => {
    const entries = this.groups().flatMap((group) =>
      group.assignments.map((assignment) => [assignment.id, { assignment, group }] as const),
    );
    return new Map(entries);
  });
  protected readonly visibleOccupancies = computed(() => {
    const schedule = this.segmentSchedule();
    const variantId = this.selectedVariantId();
    const groupId = this.selectedGroupId();

    if (!schedule) return [];

    const selectedGroup =
      groupId === null ? null : (this.groups().find((group) => group.id === groupId) ?? null);
    const allowedAssignmentIds = selectedGroup
      ? new Set(selectedGroup.assignments.map((assignment) => assignment.id))
      : null;

    return schedule.occupancies.filter(
      (occupancy) =>
        occupancy.schedule_variant_id === variantId &&
        (allowedAssignmentIds === null || allowedAssignmentIds.has(occupancy.assignment_id)),
    );
  });
  protected readonly occupanciesByCell = computed(() => {
    const assignmentById = this.assignmentById();
    const cells = new Map<string, StudyPlanScheduleCellItem[]>();

    for (const occupancy of this.visibleOccupancies()) {
      const resolved = assignmentById.get(occupancy.assignment_id);
      if (!resolved) continue;

      const key = this.cellKey(occupancy.schedule_block_id, occupancy.day_id);
      const items = cells.get(key) ?? [];
      items.push({ occupancy, ...resolved });
      cells.set(key, items);
    }

    return cells;
  });
  private readonly occupancyIdentitySet = computed(() => {
    const schedule = this.segmentSchedule();

    return new Set(
      (schedule?.occupancies ?? []).map((occupancy) =>
        this.occupancyIdentityKey(
          occupancy.assignment_id,
          occupancy.schedule_block_id,
          occupancy.day_id,
          occupancy.schedule_variant_id,
        ),
      ),
    );
  });

  constructor() {
    super();

    this.segmentControl.valueChanges.pipe(takeUntilDestroyed()).subscribe((segmentId) => {
      if (segmentId !== this.selectedSegmentId()) this.selectSegment(segmentId);
    });
    this.groupControl.valueChanges.pipe(takeUntilDestroyed()).subscribe((groupId) => {
      this.selectedGroupId.set(groupId);
    });
    this.variantControl.valueChanges.pipe(takeUntilDestroyed()).subscribe((variantId) => {
      this.selectedVariantId.set(variantId);
    });

    effect(() => {
      this.setScreenOptions(this.screenOptions());
      this.selectedStageId.set(this.stageId());
      this.selectedGradeId.set(this.gradeId());

      const route = this.route()?.trim() ?? '';
      const stageId = this.stageId();
      const gradeId = this.gradeId();
      if (!route || stageId === null || gradeId === null) {
        this.resetContext();
        return;
      }

      const contextKey = `${route}|${stageId}|${gradeId}`;
      if (contextKey !== this.loadedContextKey()) {
        this.loadContext(route, stageId, gradeId, contextKey);
      }
    });
  }

  protected cellAssignments(blockId: number, dayId: number): StudyPlanScheduleCellItem[] {
    return this.occupanciesByCell().get(this.cellKey(blockId, dayId)) ?? [];
  }

  protected formatTime(value: string | null | undefined): string {
    return value?.slice(0, 5) || '--:--';
  }

  protected dropCell(blockId: number, dayId: number): StudyPlanScheduleDropCell {
    return { blockId, dayId };
  }

  protected assignmentDragData(assignment: StudyPlanScheduleAssignment): StudyPlanScheduleDragData {
    return { type: 'assignment', assignment };
  }

  protected occupancyDragData(item: StudyPlanScheduleCellItem): StudyPlanScheduleDragData {
    return {
      type: 'occupancy',
      occupancy: item.occupancy,
      assignment: item.assignment,
    };
  }

  protected readonly canEnterCell = (
    drag: CdkDrag<StudyPlanScheduleDragData>,
    drop: CdkDropList<StudyPlanScheduleDropCell>,
  ): boolean => {
    const variantId = this.selectedVariantId();
    const segmentId = this.selectedSegmentId();

    if (this.scheduleOperationPending() || variantId === null || segmentId === null) return false;

    return !this.hasConflictingOccupancy(
      drag.data.assignment.id,
      drop.data.blockId,
      drop.data.dayId,
      variantId,
      drag.data.type === 'occupancy' ? drag.data.occupancy.id : null,
    );
  };

  protected readonly rejectSidebarDrop = (): boolean => false;

  protected onAssignmentDragStarted(): void {
    this.activeDropCell.set(null);
  }

  protected onAssignmentDragMoved(event: CdkDragMove<StudyPlanScheduleDragData>): void {
    const pointedElement = this.document.elementFromPoint(
      event.pointerPosition.x,
      event.pointerPosition.y,
    );
    const pointedCell = pointedElement?.closest<HTMLElement>(
      '.study-plan-schedules-view__drop-cell',
    );
    const blockId = Number(pointedCell?.dataset['scheduleBlockId']);
    const dayId = Number(pointedCell?.dataset['scheduleDayId']);
    const variantId = this.selectedVariantId();
    const segmentId = this.selectedSegmentId();

    if (
      !pointedCell ||
      !Number.isInteger(blockId) ||
      !Number.isInteger(dayId) ||
      this.scheduleOperationPending() ||
      variantId === null ||
      segmentId === null ||
      this.hasConflictingOccupancy(
        event.source.data.assignment.id,
        blockId,
        dayId,
        variantId,
        event.source.data.type === 'occupancy' ? event.source.data.occupancy.id : null,
      )
    ) {
      this.activeDropCell.set(null);
      return;
    }

    this.activeDropCell.set({ blockId, dayId });
  }

  protected onSidebarDropCompleted(): void {
    this.activeDropCell.set(null);
  }

  protected isActiveDropCell(blockId: number, dayId: number): boolean {
    const activeCell = this.activeDropCell();
    return activeCell?.blockId === blockId && activeCell.dayId === dayId;
  }

  protected onScheduleDropped(
    event: CdkDragDrop<StudyPlanScheduleDropCell, unknown, StudyPlanScheduleDragData>,
  ): void {
    const route = this.route()?.trim() ?? '';
    const stageId = this.stageId();
    const gradeId = this.gradeId();
    const segmentId = this.selectedSegmentId();
    const variantId = this.selectedVariantId();
    const { blockId, dayId } = event.container.data;
    const activeCell = this.activeDropCell();
    const dragData = event.item.data;

    this.activeDropCell.set(null);

    if (dragData.type === 'assignment') {
      this.createOccupancy(
        dragData.assignment,
        route,
        stageId,
        gradeId,
        segmentId,
        variantId,
        blockId,
        dayId,
        activeCell,
      );
      return;
    }

    this.moveOccupancy(
      dragData,
      route,
      stageId,
      gradeId,
      segmentId,
      variantId,
      blockId,
      dayId,
      activeCell,
    );
  }

  protected onBack(): void {
    this.back.emit();
  }

  protected async confirmDeleteOccupancy(item: StudyPlanScheduleCellItem): Promise<void> {
    if (!this.deleteOption() || this.scheduleOperationPending()) return;

    const confirmed = await this.confirmDelete(
      'planning.study-plan-organizations.schedules.workspace.delete-title',
      'planning.study-plan-organizations.schedules.workspace.confirm-delete',
    );

    if (!confirmed || this.scheduleOperationPending()) return;

    const route = this.route()?.trim() ?? '';
    const stageId = this.stageId();
    const gradeId = this.gradeId();

    if (!route || stageId === null || gradeId === null) return;

    this.scheduleOperationPending.set(true);
    this.executeMutationRequest<{ occupancy_id: number }>(
      this.api.delete(`${route}/${stageId}/occupancies/${item.occupancy.id}?grade_id=${encodeURIComponent(String(gradeId))}`),
      () => {
        const schedule = this.segmentSchedule();
        if (!schedule) return;

        this.segmentSchedule.set({
          ...schedule,
          occupancies: schedule.occupancies.filter((occupancy) => occupancy.id !== item.occupancy.id),
        });
      },
      () => this.scheduleOperationPending.set(false),
    );
  }

  private createOccupancy(
    assignment: StudyPlanScheduleAssignment,
    route: string,
    stageId: number | null,
    gradeId: number | null,
    segmentId: number | null,
    variantId: number | null,
    blockId: number,
    dayId: number,
    activeCell: StudyPlanScheduleDropCell | null,
  ): void {
    if (
      this.scheduleOperationPending() ||
      !route ||
      stageId === null ||
      gradeId === null ||
      segmentId === null ||
      variantId === null ||
      activeCell?.blockId !== blockId ||
      activeCell.dayId !== dayId ||
      this.hasOccupancy(assignment.id, blockId, dayId, variantId)
    ) {
      return;
    }

    const payload: StudyPlanScheduleOccupancyPayload = {
      grade_id: gradeId,
      assignment_id: assignment.id,
      segment_id: segmentId,
      schedule_block_id: blockId,
      day_id: dayId,
      schedule_variant_id: variantId,
    };

    this.scheduleOperationPending.set(true);
    this.executeMutationRequest<StudyPlanScheduleOccupancy>(
      this.api.patch(`${route}/${stageId}/occupancies`, payload),
      (res) => {
        const schedule = this.segmentSchedule();
        if (!schedule) return;

        const occupancy = res.data;
        this.segmentSchedule.set({
          ...schedule,
          occupancies: [
            ...schedule.occupancies.filter(
              (item) =>
                item.id !== occupancy.id &&
                !(
                  item.assignment_id === occupancy.assignment_id &&
                  item.schedule_block_id === occupancy.schedule_block_id &&
                  item.day_id === occupancy.day_id &&
                  item.schedule_variant_id === occupancy.schedule_variant_id
                ),
            ),
            occupancy,
          ],
        });
      },
      () => this.scheduleOperationPending.set(false),
    );
  }

  private moveOccupancy(
    dragData: Extract<StudyPlanScheduleDragData, { type: 'occupancy' }>,
    route: string,
    stageId: number | null,
    gradeId: number | null,
    segmentId: number | null,
    variantId: number | null,
    blockId: number,
    dayId: number,
    activeCell: StudyPlanScheduleDropCell | null,
  ): void {
    const { assignment, occupancy } = dragData;
    const isSameCell = occupancy.schedule_block_id === blockId && occupancy.day_id === dayId;

    if (
      this.scheduleOperationPending() ||
      !route ||
      stageId === null ||
      gradeId === null ||
      segmentId === null ||
      variantId === null ||
      activeCell?.blockId !== blockId ||
      activeCell.dayId !== dayId ||
      isSameCell ||
      this.hasConflictingOccupancy(assignment.id, blockId, dayId, variantId, occupancy.id)
    ) {
      return;
    }

    const payload: StudyPlanScheduleOccupancyMovePayload = {
      grade_id: gradeId,
      segment_id: segmentId,
      schedule_block_id: blockId,
      day_id: dayId,
      schedule_variant_id: variantId,
    };

    this.scheduleOperationPending.set(true);
    this.executeMutationRequest<StudyPlanScheduleOccupancy>(
      this.api.patch(`${route}/${stageId}/occupancies/${occupancy.id}`, payload),
      (res) => {
        const schedule = this.segmentSchedule();
        if (!schedule) return;

        this.segmentSchedule.set({
          ...schedule,
          occupancies: schedule.occupancies.map((item) =>
            item.id === occupancy.id ? res.data : item,
          ),
        });
      },
      () => this.scheduleOperationPending.set(false),
    );
  }

  private loadContext(route: string, stageId: number, gradeId: number, contextKey: string): void {
    this.resetContext();
    this.loadedContextKey.set(contextKey);
    this.loadingContext.set(true);

    this.executeSilentRequest<StudyPlanScheduleContext>(
      this.api.get(`${route}/${stageId}?grade_id=${encodeURIComponent(String(gradeId))}`),
      (res) => {
        if (this.loadedContextKey() !== contextKey) return;

        this.context.set(res.data);
        const firstSegmentId = res.data.segments[0]?.id ?? null;
        this.segmentControl.setValue(firstSegmentId, { emitEvent: false });
        this.selectedSegmentId.set(firstSegmentId);
        if (firstSegmentId !== null) {
          this.loadSegment(route, stageId, gradeId, firstSegmentId, contextKey);
        }
      },
      undefined,
      () => {
        if (this.loadedContextKey() === contextKey) this.loadingContext.set(false);
      },
    );
  }

  private selectSegment(segmentId: number | null): void {
    const route = this.route()?.trim() ?? '';
    const stageId = this.stageId();
    const gradeId = this.gradeId();
    const contextKey = this.loadedContextKey();

    this.selectedSegmentId.set(segmentId);
    this.clearSegment();
    if (!route || stageId === null || gradeId === null || segmentId === null || !contextKey) return;

    this.loadSegment(route, stageId, gradeId, segmentId, contextKey);
  }

  private loadSegment(
    route: string,
    stageId: number,
    gradeId: number,
    segmentId: number,
    contextKey: string,
  ): void {
    const requestKey = `${contextKey}|${segmentId}`;
    this.segmentRequestKey.set(requestKey);
    this.loadingSegment.set(true);

    this.executeSilentRequest<StudyPlanSegmentSchedule>(
      this.api.get(
        `${route}/${stageId}/segments/${segmentId}?grade_id=${encodeURIComponent(String(gradeId))}`,
      ),
      (res) => {
        if (this.segmentRequestKey() !== requestKey) return;

        this.segmentSchedule.set(res.data);
        const firstVariantId = res.data.variants[0]?.id ?? null;
        this.selectedVariantId.set(firstVariantId);
        this.variantControl.setValue(firstVariantId, { emitEvent: false });
      },
      undefined,
      () => {
        if (this.segmentRequestKey() === requestKey) this.loadingSegment.set(false);
      },
    );
  }

  private resetContext(): void {
    this.loadedContextKey.set(null);
    this.context.set(null);
    this.selectedSegmentId.set(null);
    this.segmentControl.setValue(null, { emitEvent: false });
    this.selectedGroupId.set(null);
    this.groupControl.setValue(null, { emitEvent: false });
    this.loadingContext.set(false);
    this.clearSegment();
  }

  private clearSegment(): void {
    this.segmentRequestKey.set(null);
    this.segmentSchedule.set(null);
    this.selectedVariantId.set(null);
    this.variantControl.setValue(null, { emitEvent: false });
    this.loadingSegment.set(false);
    this.scheduleOperationPending.set(false);
    this.activeDropCell.set(null);
  }

  private cellKey(blockId: number, dayId: number): string {
    return `${blockId}:${dayId}`;
  }

  private hasOccupancy(
    assignmentId: number,
    blockId: number,
    dayId: number,
    variantId: number,
  ): boolean {
    return this.occupancyIdentitySet().has(
      this.occupancyIdentityKey(assignmentId, blockId, dayId, variantId),
    );
  }

  private hasConflictingOccupancy(
    assignmentId: number,
    blockId: number,
    dayId: number,
    variantId: number,
    excludedOccupancyId: number | null,
  ): boolean {
    return (this.segmentSchedule()?.occupancies ?? []).some(
      (occupancy) =>
        occupancy.id !== excludedOccupancyId &&
        occupancy.assignment_id === assignmentId &&
        occupancy.schedule_block_id === blockId &&
        occupancy.day_id === dayId &&
        occupancy.schedule_variant_id === variantId,
    );
  }

  private occupancyIdentityKey(
    assignmentId: number,
    blockId: number,
    dayId: number,
    variantId: number,
  ): string {
    return `${assignmentId}:${blockId}:${dayId}:${variantId}`;
  }
}
