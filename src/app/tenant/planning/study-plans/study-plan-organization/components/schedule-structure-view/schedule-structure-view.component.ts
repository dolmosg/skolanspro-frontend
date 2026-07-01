import { Component, computed, effect, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import type { ScreenChildItem, ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import type { IStudyPlanScheduleStructure } from '@shared/interfaces/study-plan-interfaces';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';
import { ScheduleSegmentDetailComponent } from '../schedule-segment-detail/schedule-segment-detail.component';
import { ScheduleStructureDetailComponent } from '../schedule-structure-detail/schedule-structure-detail.component';

interface ScheduleStructureViewResponse {
  options: ScreenOptionItem[];
  children: ScreenChildItem[];
  structure: IStudyPlanScheduleStructure;
}

type ScheduleStructureSelectionContext = 'structure' | 'segment' | 'create-segment';

@Component({
  selector: 'app-schedule-structure-view',
  imports: [
    TranslatePipe,
    UiButtonComponent,
    UiIconComponent,
    ScheduleSegmentDetailComponent,
    ScheduleStructureDetailComponent,
  ],
  templateUrl: './schedule-structure-view.component.html',
  styleUrl: './schedule-structure-view.component.scss',
})
export class ScheduleStructureViewComponent extends SkolansBaseComponent {
  private readonly loadedKey = signal<string | null>(null);
  private readonly selectedInputKey = signal<string | null>(null);
  private readonly selectedContext = signal<ScheduleStructureSelectionContext>('structure');
  private readonly selectedSegmentId = signal<number | null>(null);

  readonly route = input<string | null>(null);
  readonly structureId = input<number | null>(null);
  readonly segmentId = input<number | null>(null);
  readonly back = output<void>();
  readonly saved = output<void>();

  protected readonly response = signal<ScheduleStructureViewResponse | null>(null);
  protected readonly structure = computed(() => this.response()?.structure ?? null);
  protected readonly segments = computed(() => this.structure()?.segments ?? []);

  protected readonly selectedSegment = computed(() => {
    const segmentId = this.selectedSegmentId();

    if (!segmentId) {
      return null;
    }

    return this.structure()?.segments?.find((segment) => segment.id === segmentId) ?? null;
  });

  protected readonly isStructureSelected = computed(() => {
    return this.selectedContext() === 'structure';
  });
  protected readonly hasSelectedSegment = computed(() => {
    return this.selectedContext() === 'segment' && !!this.selectedSegment();
  });
  protected readonly isCreatingSegment = computed(() => {
    return this.selectedContext() === 'create-segment';
  });

  protected readonly segmentChild = computed(() =>
    this.getScreenChild('study-plan-schedule-segments'),
  );
  protected readonly segmentRoute = computed(() =>
    this.getScreenChildRoute('study-plan-schedule-segments'),
  );
  protected readonly addSegmentOption = computed(() =>
    this.getScreenChildOption('study-plan-schedule-segments', 'add'),
  );

  constructor() {
    super();

    effect(() => {
      const route = this.route();
      const structureId = this.structureId();
      const segmentId = this.segmentId();

      if (!route || !structureId) {
        this.resetSelection();
        return;
      }

      const key = `${structureId}:${segmentId ?? 'structure'}`;

      if (this.selectedInputKey() === key) {
        return;
      }

      this.selectedInputKey.set(key);

      if (segmentId) {
        this.selectedContext.set('segment');
        this.selectedSegmentId.set(segmentId);
        return;
      }

      this.selectedContext.set('structure');
      this.selectedSegmentId.set(null);
    });

    effect(() => {
      const route = this.route();
      const structureId = this.structureId();

      if (!route || !structureId) {
        this.loadedKey.set(null);
        this.response.set(null);
        this.clearScreenOptions();
        this.clearScreenChildren();
        this.resetSelection();
        return;
      }

      const key = `${route}/${structureId}`;

      if (this.loadedKey() === key) {
        return;
      }

      this.loadedKey.set(key);
      this.response.set(null);
      this.clearScreenOptions();
      this.clearScreenChildren();
      this.loadStructure(route, structureId);
    });
  }

  protected loadStructure(route: string, structureId: number): void {
    const key = `${route}/${structureId}`;

    this.executeSilentRequest<ScheduleStructureViewResponse>(
      this.api.get(`${route}/${structureId}`),
      (res) => {
        if (this.loadedKey() !== key) {
          return;
        }

        this.setScreenOptions(res.data.options);
        this.setScreenChildren(res.data.children);
        this.response.set(res.data);
      },
      () => {
        if (this.loadedKey() !== key) {
          return;
        }

        this.clearScreenOptions();
        this.clearScreenChildren();
        this.response.set(null);
      },
    );
  }

  protected lessonsCountLabelKey(count: number | null | undefined): string {
    return count === 1
      ? 'planning.study-plan-schedule-segments.metrics.lesson-count'
      : 'planning.study-plan-schedule-segments.metrics.lessons-count';
  }

  protected breaksCountLabelKey(count: number | null | undefined): string {
    return count === 1
      ? 'planning.study-plan-schedule-segments.metrics.break-count'
      : 'planning.study-plan-schedule-segments.metrics.breaks-count';
  }

  protected isSegmentSelected(segmentId: number | null): boolean {
    if (segmentId === null) {
      return false;
    }

    return this.selectedContext() === 'segment' && this.selectedSegmentId() === segmentId;
  }

  protected selectStructure(): void {
    this.selectedContext.set('structure');
    this.selectedSegmentId.set(null);
  }

  protected selectSegment(segmentId: number | null): void {
    if (segmentId === null) {
      return;
    }

    if (this.isSegmentSelected(segmentId)) {
      this.selectStructure();
      return;
    }

    this.selectedContext.set('segment');
    this.selectedSegmentId.set(segmentId);
  }

  protected startCreateSegment(): void {
    if (!this.structureId() || !this.segmentRoute() || !this.addSegmentOption()) {
      return;
    }

    this.selectedContext.set('create-segment');
    this.selectedSegmentId.set(null);
  }

  protected onBack(): void {
    this.back.emit();
  }

  protected onStructureSaved(): void {
    const route = this.route();
    const structureId = this.structureId();

    if (route && structureId) {
      this.loadStructure(route, structureId);
    }

    this.saved.emit();
  }

  protected onSegmentSaved(segmentId: number | null): void {
    const route = this.route();
    const structureId = this.structureId();

    if (segmentId !== null) {
      this.selectedContext.set('segment');
      this.selectedSegmentId.set(segmentId);
    }

    if (route && structureId) {
      this.loadStructure(route, structureId);
    }

    this.saved.emit();
  }

  protected onSegmentDeleted(): void {
    const route = this.route();
    const structureId = this.structureId();

    this.selectStructure();

    if (route && structureId) {
      this.loadStructure(route, structureId);
    }

    this.saved.emit();
  }

  protected onSegmentCreateCancelled(): void {
    this.selectStructure();
  }

  private resetSelection(): void {
    this.selectedContext.set('structure');
    this.selectedSegmentId.set(null);
    this.selectedInputKey.set(null);
  }
}
