import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import type { ScreenChildItem, ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import type { IDay } from '@shared/interfaces/central.interfaces';
import type { IBlockType, IGender, IWorkingDay } from '@shared/interfaces/configuration.interfaces';
import type {
  IStudyPlanScheduleBlock,
  IStudyPlanScheduleSegment,
} from '@shared/interfaces/study-plan-interfaces';
import { FormErrorComponent } from '@shared/ui/form-error/form-error';
import { SkSelectComponent } from '@shared/ui/sk-select/sk-select.component';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';
import { ScheduleSegmentBlocksComponent } from '../schedule-segment-blocks/schedule-segment-blocks.component';
import type { ScheduleBlockChangeEvent } from '../schedule-segment-blocks/schedule-segment-blocks.component';

interface ScheduleSegmentDetailResponse {
  options: ScreenOptionItem[];
  children: ScreenChildItem[];
  segment: IStudyPlanScheduleSegment;
  catalogs: {
    block_types: IBlockType[];
    genders: IGender[];
    working_days: IWorkingDay[];
  };
}

@Component({
  selector: 'app-schedule-segment-detail',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    FormErrorComponent,
    SkSelectComponent,
    UiButtonComponent,
    UiIconComponent,
    ScheduleSegmentBlocksComponent,
  ],
  templateUrl: './schedule-segment-detail.component.html',
  styleUrl: './schedule-segment-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleSegmentDetailComponent extends SkolansBaseComponent {
  private readonly fb = inject(FormBuilder);
  private readonly loadedKey = signal<string | null>(null);

  protected readonly segmentMode = signal<'view' | 'editing'>('view');
  protected readonly saving = signal(false);
  protected readonly deleting = signal(false);
  protected readonly updatingDays = signal(false);

  readonly structureId = input<number | null>(null);
  readonly segmentId = input<number | null>(null);
  readonly route = input<string | null>(null);
  readonly createMode = input(false);
  readonly saved = output<number | null>();
  readonly deleted = output<number>();
  readonly createCancelled = output<void>();

  protected readonly form = this.fb.group({
    gender_id: this.fb.control<number | null>(null),
    name: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(255)]),
    active: this.fb.nonNullable.control(true),
  });

  protected readonly response = signal<ScheduleSegmentDetailResponse | null>(null);
  protected readonly segment = computed(() => this.response()?.segment ?? null);
  protected readonly isCreatingSegment = computed(() => this.segment()?.id === null);
  protected readonly addOption = computed(() => this.getScreenOption('add'));
  protected readonly updateOption = computed(() => this.getScreenOption('update'));
  protected readonly deleteOption = computed(() => this.getScreenOption('delete'));
  protected readonly updateOptionVariant = computed(() =>
    this.getScreenOptionVariant('update', 'primary'),
  );
  protected readonly deleteOptionVariant = computed(() =>
    this.getScreenOptionVariant('delete', 'danger'),
  );

  protected readonly segmentDays = computed(() =>
    [...(this.segment()?.segment_days ?? [])].sort((a, b) => {
      const aOrder = a.day?.order ?? a.day_id;
      const bOrder = b.day?.order ?? b.day_id;

      return aOrder - bOrder;
    }),
  );

  protected readonly workingDays = computed(() =>
    [...(this.response()?.catalogs.working_days ?? [])].sort((a, b) => {
      const aOrder = a.day?.order ?? a.order ?? a.day_id;
      const bOrder = b.day?.order ?? b.order ?? b.day_id;

      return aOrder - bOrder;
    }),
  );

  protected readonly blocks = computed(() =>
    [...(this.segment()?.blocks ?? [])].sort((a, b) => {
      if (a.order !== b.order) {
        return a.order - b.order;
      }

      return a.id - b.id;
    }),
  );
  protected readonly blockTypes = computed(() => this.response()?.catalogs.block_types ?? []);
  protected readonly childControllers = computed(() => this.response()?.children ?? []);

  protected readonly daysCount = computed(() => this.segmentDays().length);
  protected readonly lessonsCount = computed(() => {
    const segment = this.segment();

    return (
      segment?.lessons_count ?? this.blocks().filter((block) => this.isLessonBlock(block)).length
    );
  });
  protected readonly breaksCount = computed(() => {
    const segment = this.segment();

    return segment?.breaks_count ?? this.blocks().filter((block) => this.isBreakBlock(block)).length;
  });
  protected readonly blocksCount = computed(() => {
    const segment = this.segment();

    return segment?.blocks_count ?? this.blocks().length;
  });
  protected readonly genders = computed(() => this.response()?.catalogs.genders ?? []);

  protected readonly dayLabel = computed(() =>
    this.metricTranslationKey(this.daysCount(), 'day', 'days'),
  );
  protected readonly lessonLabel = computed(() =>
    this.metricTranslationKey(this.lessonsCount(), 'lesson', 'lessons'),
  );
  protected readonly breakLabel = computed(() =>
    this.metricTranslationKey(this.breaksCount(), 'break', 'breaks'),
  );
  protected readonly blockLabel = computed(() =>
    this.metricTranslationKey(this.blocksCount(), 'block', 'blocks'),
  );

  constructor() {
    super();

    effect(() => {
      const route = this.route();
      const structureId = this.structureId();
      const segmentId = this.segmentId();
      const createMode = this.createMode();

      if (!route || !structureId || (!createMode && !segmentId)) {
        this.loadedKey.set(null);
        this.response.set(null);
        this.clearScreenChildren();
        return;
      }

      const key = createMode
        ? `${route}/${structureId}/create`
        : `${route}/${structureId}/${segmentId}`;

      if (this.loadedKey() === key) {
        return;
      }

      this.loadedKey.set(key);
      this.response.set(null);
      this.segmentMode.set('view');
      this.saving.set(false);
      this.deleting.set(false);
      this.updatingDays.set(false);
      this.clearScreenChildren();
      this.loadSegment(key);
    });

    effect(() => {
      if (!this.isEditing()) {
        this.patchForm(this.segment());
      }
    });
  }

  protected readonly isEditing = computed(() => this.segmentMode() === 'editing');

  protected startSegmentEdit(): void {
    const segment = this.segment();

    if (!segment || !this.updateOption()) {
      return;
    }

    this.patchForm(segment);
    this.segmentMode.set('editing');
  }

  protected cancelSegmentEdit(): void {
    if (this.isCreatingSegment()) {
      this.loadedKey.set(null);
      this.response.set(null);
      this.clearScreenOptions();
      this.clearScreenChildren();
      this.segmentMode.set('view');
      this.createCancelled.emit();
      return;
    }

    this.patchForm(this.segment());
    this.segmentMode.set('view');
  }

  protected saveSegment(): void {
    const route = this.route();
    const structureId = this.structureId();
    const segment = this.segment();
    const isCreating = segment?.id === null;

    if (
      !route ||
      !structureId ||
      !segment ||
      this.saving() ||
      (isCreating && !this.addOption()) ||
      (!isCreating && (!this.updateOption() || segment.id === null))
    ) {
      return;
    }

    this.form.markAllAsTouched();
    this.form.updateValueAndValidity();

    if (this.form.invalid) {
      return;
    }

    const values = this.form.getRawValue();
    const payload = {
      study_plan_schedule_structure_id: structureId,
      gender_id: values.gender_id,
      name: values.name,
      active: values.active,
    };

    this.saving.set(true);

    const request = isCreating
      ? this.api.post<ScheduleSegmentDetailResponse>(`${route}/${structureId}`, payload)
      : this.api.put<ScheduleSegmentDetailResponse>(
          `${route}/${structureId}/${segment.id}`,
          payload,
        );

    this.executeMutationRequest<ScheduleSegmentDetailResponse>(
      request,
      (res) => {
        this.setScreenOptions(res.data.options);
        this.setScreenChildren(res.data.children);
        this.response.set(res.data);
        this.patchForm(res.data.segment);
        this.segmentMode.set('view');
        this.saved.emit(res.data.segment.id);
      },
      () => {
        this.saving.set(false);
      },
    );
  }

  protected async confirmDeleteSegment(): Promise<void> {
    const route = this.route();
    const structureId = this.structureId();
    const segment = this.segment();

    if (
      !route ||
      !structureId ||
      !segment ||
      segment.id === null ||
      !this.deleteOption() ||
      this.deleting()
    ) {
      return;
    }

    const confirmed = await this.confirmDelete(
      'planning.study-plan-schedule-segments.detail.messages.delete-title',
      'planning.study-plan-schedule-segments.detail.messages.confirm-delete',
    );

    if (!confirmed) {
      return;
    }

    this.deleting.set(true);

    this.executeMutationRequest<{ segment_id: number }>(
      this.api.delete<{ segment_id: number }>(`${route}/${structureId}/${segment.id}`),
      (res) => {
        this.response.set(null);
        this.segmentMode.set('view');
        this.deleted.emit(res.data.segment_id ?? segment.id);
      },
      () => {
        this.deleting.set(false);
      },
    );
  }

  protected genderTranslation(segment: IStudyPlanScheduleSegment): string {
    return segment.gender?.translation || 'common.no-data';
  }

  protected dayTranslation(day: IDay | null | undefined): string {
    return day?.translation || day?.name || 'common.no-data';
  }

  protected isSegmentDaySelected(dayId: number): boolean {
    return this.segmentDays().some((segmentDay) => segmentDay.day_id === dayId);
  }

  protected updateSegmentDay(dayId: number, event: Event): void {
    const input = event.target instanceof HTMLInputElement ? event.target : null;
    const route = this.route();
    const structureId = this.structureId();
    const segment = this.segment();
    const previousChecked = this.isSegmentDaySelected(dayId);

    if (!input) {
      return;
    }

    const checked = input.checked;

    if (
      !route ||
      !structureId ||
      !segment ||
      segment.id === null ||
      !this.updateOption() ||
      this.updatingDays()
    ) {
      input.checked = previousChecked;
      return;
    }

    const currentDayIds = this.segmentDays().map((segmentDay) => segmentDay.day_id);
    const nextDayIds = checked
      ? Array.from(new Set([...currentDayIds, dayId]))
      : currentDayIds.filter((currentDayId) => currentDayId !== dayId);

    this.updatingDays.set(true);
    let updatedFromBackend = false;

    this.executeMutationRequest<ScheduleSegmentDetailResponse>(
      this.api.put<ScheduleSegmentDetailResponse>(
        `${route}/${structureId}/${segment.id}/days`,
        {
          day_ids: nextDayIds,
        },
      ),
      (res) => {
        this.setScreenOptions(res.data.options);
        this.setScreenChildren(res.data.children);
        this.response.set(res.data);
        updatedFromBackend = true;
      },
      () => {
        if (!updatedFromBackend) {
          input.checked = previousChecked;
        }

        this.updatingDays.set(false);
      },
    );
  }

  protected reloadSegment(): void {
    const key = this.loadedKey();

    if (!key) {
      return;
    }

    this.loadSegment(key);
  }

  protected handleBlockChanged(event: ScheduleBlockChangeEvent): void {
    const current = this.response();

    if (!current) {
      return;
    }

    const currentBlocks = current.segment.blocks ?? [];
    let nextBlocks: IStudyPlanScheduleBlock[];

    switch (event.type) {
      case 'created':
        nextBlocks = [...currentBlocks, event.block];
        break;

      case 'updated':
        nextBlocks = currentBlocks.map((block) =>
          block.id === event.block.id ? event.block : block,
        );
        break;

      case 'deleted':
        nextBlocks = currentBlocks.filter((block) => block.id !== event.blockId);
        break;
    }

    this.response.set({
      ...current,
      segment: {
        ...current.segment,
        blocks: nextBlocks,
        blocks_count: nextBlocks.length,
        lessons_count: nextBlocks.filter((block) => this.isLessonBlock(block)).length,
        breaks_count: nextBlocks.filter((block) => this.isBreakBlock(block)).length,
      },
    });
  }

  private loadSegment(url: string): void {
    this.executeRequest<ScheduleSegmentDetailResponse>(this.api.get(url), (res) => {
      if (this.loadedKey() !== url) {
        return;
      }

      this.setScreenOptions(res.data.options);
      this.setScreenChildren(res.data.children);
      this.response.set(res.data);
      this.segmentMode.set(res.data.segment.id === null ? 'editing' : 'view');
    });
  }

  private patchForm(segment: IStudyPlanScheduleSegment | null): void {
    this.form.reset({
      gender_id: segment?.gender_id ?? null,
      name: segment?.name ?? '',
      active: segment?.active ?? true,
    });
  }

  private metricTranslationKey(count: number, singular: string, plural: string): string {
    const metric = count === 1 ? singular : plural;

    return `planning.study-plan-schedule-segments.detail.metrics.${metric}`;
  }

  private isLessonBlock(block: IStudyPlanScheduleBlock): boolean {
    return block.block_type_id === 1 || block.type?.name === 'lesson';
  }

  private isBreakBlock(block: IStudyPlanScheduleBlock): boolean {
    return block.block_type_id === 2 || block.type?.name === 'break';
  }
}
