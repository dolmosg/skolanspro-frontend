import { Component, computed, effect, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import type { ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';

import type { StudyPlanScheduleStructureSummary } from '../../study-plan-organization.component';
import { UiButtonComponent } from 'app/shared/ui/ui-button/ui-button';

type StudyPlanScheduleStructureSummaryItem = StudyPlanScheduleStructureSummary['items'][number];

type StudyPlanScheduleStructureSegmentSummary =
  StudyPlanScheduleStructureSummaryItem['segments'][number];

@Component({
  selector: 'app-study-plan-schedule-structure-summary',
  imports: [TranslatePipe, UiIconComponent, UiButtonComponent],
  templateUrl: './study-plan-schedule-structure-summary.component.html',
  styleUrl: './study-plan-schedule-structure-summary.component.scss',
})
export class StudyPlanScheduleStructureSummaryComponent extends SkolansBaseComponent {
  readonly summary = input<StudyPlanScheduleStructureSummary | null>(null);
  readonly route = input<string | null>(null);
  /**
   * Backend-resolved child options passed by Organization.
   * This summary remains presentational and only renders actions it receives.
   */
  readonly receivedOptions = input<ScreenOptionItem[]>([], { alias: 'options' });
  readonly structureSelected = output<number>();
  readonly segmentSelected = output<{ structureId: number; segmentId: number }>();
  readonly structureActivated = output<void>();

  protected readonly activatingStructureId = signal<number | null>(null);

  protected readonly structures = computed<StudyPlanScheduleStructureSummaryItem[]>(() => {
    return [...(this.summary()?.items ?? [])].sort((a, b) => a.order - b.order);
  });

  protected readonly hasStructures = computed(() => this.structures().length > 0);

  /**
   * Local Add action derived from the child options provided by the parent.
   */
  protected readonly addStructureOption = computed(() => this.getScreenOption('add'));

  protected readonly updateStructureOption = computed(() => this.getScreenOption('update'));

  constructor() {
    super();

    effect(() => {
      this.setScreenOptions(this.receivedOptions());
    });
  }

  protected orderedSegments(
    structure: StudyPlanScheduleStructureSummaryItem,
  ): StudyPlanScheduleStructureSegmentSummary[] {
    return [...structure.segments].sort((a, b) => a.order - b.order);
  }

  protected isStructureActiveControlChecked(
    structure: StudyPlanScheduleStructureSummaryItem,
  ): boolean {
    return structure.active || this.structures().length === 1;
  }

  protected canActivateStructure(structure: StudyPlanScheduleStructureSummaryItem): boolean {
    return (
      !structure.active &&
      this.structures().length > 1 &&
      !!this.updateStructureOption() &&
      !!this.route() &&
      this.activatingStructureId() === null
    );
  }

  protected activateStructure(
    event: Event,
    structure: StudyPlanScheduleStructureSummaryItem,
  ): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.canActivateStructure(structure)) {
      return;
    }

    const route = this.route();

    if (!route) {
      return;
    }

    this.activatingStructureId.set(structure.id);

    this.executeMutationRequest<{ structure: StudyPlanScheduleStructureSummaryItem }>(
      this.api.patch<{ structure: StudyPlanScheduleStructureSummaryItem }>(
        `${route}/${structure.id}/activate`,
        {},
      ),
      () => {
        this.structureActivated.emit();
      },
      () => {
        this.activatingStructureId.set(null);
      },
    );
  }

  protected selectStructure(structureId: number): void {
    this.structureSelected.emit(structureId);
  }

  protected selectSegment(event: Event, structureId: number, segmentId: number): void {
    event.stopPropagation();
    this.segmentSelected.emit({ structureId, segmentId });
  }

  protected selectStructureFromKeyboard(event: KeyboardEvent, structureId: number): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    this.selectStructure(structureId);
  }

  protected selectSegmentFromKeyboard(
    event: KeyboardEvent,
    structureId: number,
    segmentId: number,
  ): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    this.selectSegment(event, structureId, segmentId);
  }

  protected segmentsTranslationKey(count: number): string {
    return count === 1
      ? 'planning.study-plan-organizations.schedule-structure.segment-count'
      : 'planning.study-plan-organizations.schedule-structure.segments-count';
  }

  protected blocksTranslationKey(count: number): string {
    return count === 1
      ? 'planning.study-plan-organizations.schedule-structure.block-count'
      : 'planning.study-plan-organizations.schedule-structure.blocks-count';
  }

  protected breaksTranslationKey(count: number): string {
    return count === 1
      ? 'planning.study-plan-organizations.schedule-structure.break-count'
      : 'planning.study-plan-organizations.schedule-structure.breaks-count';
  }
}
