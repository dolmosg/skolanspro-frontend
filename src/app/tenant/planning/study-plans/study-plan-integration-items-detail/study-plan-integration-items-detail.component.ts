import { PercentPipe } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { SklConfirmModal } from '@shared/base/skl-confirm-modal/skl-confirm-modal';
import type { ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import type {
  IStudyPlanTerm,
  ISubjectIntegrationItem,
  ISubjectIntegrationItemTermWeight,
} from '@shared/interfaces/study-plan-interfaces';
import { ApiService } from '@shared/services/api-service';
import { SklModalService } from '@shared/services/skl-modal-service';
import { ToastService } from '@shared/services/toast-service';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';
import { firstValueFrom } from 'rxjs';
import { finalize } from 'rxjs/operators';

import {
  AddIntegrationSubjectsModalComponent,
  AddIntegrationSubjectsModalData,
  AddIntegrationSubjectsModalResult,
  AvailableStageSubject,
} from '../study-plan-integration-add-subjects-modal/study-plan-integration-add-subjects-modal.component';

interface StudyPlanIntegrationWeightTotal {
  id: string | number;
  label: string;
  translation?: string;
  total: number;
}

interface StudyPlanIntegrationDisplayRow {
  item: ISubjectIntegrationItem;
  locked: boolean;
  crossover: boolean;
}

interface AvailableSubjectsResponseData {
  subjects: AvailableStageSubject[];
}

interface StoreIntegrationItemsResponseData {
  items: ISubjectIntegrationItem[];
  items_count?: number;
}

interface UpdateCalculationPayload {
  items: UpdateCalculationPayloadItem[];
}

interface UpdateCalculationPayloadItem {
  id: number;
  final_weight: number;
  failure_blocking: boolean;
  enrollment_dependent: boolean;
  term_weights: UpdateCalculationTermWeightPayload[];
}

interface UpdateCalculationTermWeightPayload {
  id: number;
  study_plan_term_id: number;
  weight: number;
}

interface UpdateCalculationResponseData {
  items: ISubjectIntegrationItem[];
  items_count?: number;
}

interface RemoveIntegrationItemResponseData {
  item_id: number;
  items_count?: number;
}

@Component({
  selector: 'app-study-plan-integration-items-detail',
  standalone: true,
  imports: [TranslatePipe, UiButtonComponent, UiIconComponent, PercentPipe],
  templateUrl: './study-plan-integration-items-detail.component.html',
  styleUrl: './study-plan-integration-items-detail.component.scss',
})
/**
 * Renders and edits one section of a subject integration calculation.
 *
 * The parent detail component owns the complete integration and is the source
 * of truth for `integration.items`. This child owns only the section-level
 * presentation state: expansion, inline editing, pending add/remove
 * reconciliation, and the API calls that mutate integration items.
 *
 * API endpoints used by this component:
 * - GET `{route}/{stageId}/{integrationId}/available-subjects`
 * - POST `{route}/{stageId}/{integrationId}`
 * - PUT `{route}/{stageId}/{integrationId}/calculation`
 * - DELETE `{route}/{stageId}/{integrationId}/{itemId}`
 *
 * `sectionItems()` contains only the editable items for this instance. In grade
 * mode, `displayItems()` also includes locked crossover rows so their weights
 * affect totals, but those rows must not be sent when saving the grade
 * calculation. Weight totals are allowed to be visually invalid so users can
 * inspect an incomplete configuration, but saving is blocked while totals are
 * invalid. Weights are normalized on blur so users can type either percentages
 * or fractions naturally during input.
 *
 * When future changes add or remove items, emit outputs to the parent after the
 * local optimistic state is updated. Changes that affect other sections, such
 * as adding a crossover, must update the parent integration so sibling
 * components recalculate from the same item set.
 */
export class StudyPlanIntegrationItemsDetailComponent {
  private static nextEditorId = 0;
  private static activeEditingId = signal<number | null>(null);

  private readonly api = inject(ApiService);
  private readonly modal = inject(SklModalService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  private readonly editorId = ++StudyPlanIntegrationItemsDetailComponent.nextEditorId;

  /*
   * Inputs / outputs
   *
   * The parent provides the current section items, crossover rows, route
   * context, terms, and backend screen options. This child emits item additions
   * and removals so the parent can rebuild the complete integration item list.
   */
  readonly title = input<string>('');
  readonly icon = input<string>('graduation-cap');
  readonly mode = input<'grade' | 'crossover'>('grade');
  readonly route = input<string | null>(null);
  readonly stageId = input<number | null>(null);
  readonly integrationId = input<number | null>(null);
  readonly gradeId = input<number | null>(null);

  readonly items = input<ISubjectIntegrationItem[]>([]);
  readonly crossovers = input<ISubjectIntegrationItem[]>([]);
  readonly terms = input<IStudyPlanTerm[]>([]);
  readonly options = input<ScreenOptionItem[]>([]);
  readonly itemsChanged = output<ISubjectIntegrationItem[]>();
  readonly itemRemoved = output<number>();

  /*
   * Local reconciliation state
   *
   * `addedItems` lets the current child display newly created rows immediately.
   * `removedItemIds` hides rows that came from parent inputs without mutating
   * the input array. The parent is still notified so sibling children can
   * recompute from the updated integration.
   */
  readonly expanded = signal<boolean>(false);
  readonly editing = signal<boolean>(false);
  readonly loadingAvailableSubjects = signal(false);
  readonly savingSubjects = signal(false);
  readonly savingCalculation = signal(false);
  readonly removingItemId = signal<number | null>(null);
  readonly removedItemIds = signal<Set<number>>(new Set());
  private readonly addedItems = signal<ISubjectIntegrationItem[]>([]);
  private readonly calculationVersion = signal<number>(0);
  private calculationSnapshot: ISubjectIntegrationItem[] | null = null;

  readonly hasExternalEditing = computed(() => {
    const activeEditingId = StudyPlanIntegrationItemsDetailComponent.activeEditingId();

    return activeEditingId !== null && activeEditingId !== this.editorId;
  });

  readonly actionsLocked = computed(() => this.editing() || this.hasExternalEditing());

  readonly canAdd = computed(() => this.options().some((option) => option.name === 'add'));

  readonly canUpdate = computed(() => this.options().some((option) => option.name === 'update'));

  readonly canDelete = computed(() => this.options().some((option) => option.name === 'delete'));

  /*
   * Derived display state
   *
   * Crossovers are locked when rendered inside a grade section. They contribute
   * to totals for context, but grade sections must only edit and save their own
   * `sectionItems()`.
   */
  readonly sectionItems = computed(() => {
    const removedItemIds = this.removedItemIds();

    return this.mergeItems(this.items(), this.addedItems()).filter(
      (item) => !removedItemIds.has(item.id),
    );
  });

  readonly displayItems = computed(() => {
    if (this.mode() === 'crossover') {
      return this.sectionItems().map((item) => ({
        item,
        locked: false,
        crossover: true,
      }));
    }

    return [
      ...this.crossovers().map((item) => ({
        item,
        locked: true,
        crossover: true,
      })),
      ...this.sectionItems().map((item) => ({
        item,
        locked: false,
        crossover: false,
      })),
    ];
  });

  readonly subjectsCount = computed(() => this.displayItems().length);

  readonly hasItems = computed(() => this.displayItems().length > 0);

  readonly actionsVisible = computed(() => this.expanded() || !this.hasItems());

  readonly showWeightValidation = computed(() => this.mode() === 'grade');

  readonly weightTotals = computed<StudyPlanIntegrationWeightTotal[]>(() => {
    this.calculationVersion();

    if (!this.showWeightValidation()) {
      return [];
    }

    const finalWeightTotal = this.displayItems().reduce((sum, row) => {
      const numericWeight = Number(row.item?.final_weight ?? 0);

      return Number.isNaN(numericWeight) ? sum : sum + numericWeight;
    }, 0);

    return [
      {
        id: 'final_weight',
        label: 'weight',
        translation: 'planning.study-plan-integration-items.weight',
        total: finalWeightTotal,
      },
      ...this.terms().map((term) => {
        const total = this.displayItems().reduce((sum, row) => {
          const weight = this.getItemTermWeight(row.item, term.id);
          const numericWeight = Number(weight ?? 0);

          return Number.isNaN(numericWeight) ? sum : sum + numericWeight;
        }, 0);

        return {
          id: term.id,
          label: term.code,
          total,
        };
      }),
    ];
  });

  readonly weightIssues = computed(() => {
    return this.weightTotals().filter((issue) => this.hasInvalidWeightTotal(issue.total));
  });

  readonly hasWeightIssues = computed(() => this.weightIssues().length > 0);

  protected hasInvalidWeightTotal(total: number): boolean {
    const tolerance = 0.0001;

    return Math.abs(total - 1) > tolerance;
  }

  protected toggleExpanded(): void {
    if (this.editing()) {
      return;
    }

    this.expanded.update((current) => !current);
  }

  protected startEditing(event: Event): void {
    event.stopPropagation();

    if (!this.canUpdate() || this.hasExternalEditing()) {
      return;
    }

    this.createCalculationSnapshot();
    StudyPlanIntegrationItemsDetailComponent.activeEditingId.set(this.editorId);
    this.expanded.set(true);
    this.editing.set(true);
  }

  /*
   * Save calculation flow
   *
   * The payload is built from `sectionItems()` by design. `displayItems()` may
   * contain locked crossover rows in grade mode, and those rows belong to the
   * crossover section rather than the grade being saved.
   */
  protected async saveCalculation(event: Event): Promise<void> {
    event.stopPropagation();

    const route = this.route();
    const stageId = this.stageId();
    const integrationId = this.integrationId();

    if (
      !this.editing() ||
      this.hasWeightIssues() ||
      this.savingCalculation() ||
      !route ||
      !stageId ||
      !integrationId
    ) {
      return;
    }

    const payload = this.buildCalculationPayload();

    if (!payload.items.length) {
      return;
    }

    this.savingCalculation.set(true);

    try {
      const response = await firstValueFrom(
        this.api
          .put<UpdateCalculationResponseData>(
            `${route}/${stageId}/${integrationId}/calculation`,
            payload,
          )
          .pipe(finalize(() => this.savingCalculation.set(false))),
      );

      if (!response.success) {
        this.toast.error(response.message);
        return;
      }

      this.replaceSectionItems(response.data.items ?? []);
      this.calculationSnapshot = null;
      StudyPlanIntegrationItemsDetailComponent.activeEditingId.set(null);
      this.editing.set(false);
      this.refreshCalculationTotals();
      this.toast.success(response.message);
    } catch {
      return;
    }
  }

  protected cancelEditing(event: Event): void {
    event.stopPropagation();

    if (!this.editing()) {
      return;
    }

    this.restoreCalculationSnapshot();
    this.calculationSnapshot = null;
    StudyPlanIntegrationItemsDetailComponent.activeEditingId.set(null);
    this.editing.set(false);
  }

  protected stopHeaderToggle(event: Event): void {
    event.stopPropagation();
  }

  /*
   * Remove subject flow
   *
   * The item is removed locally for this child and emitted to the parent so the
   * complete integration item list can be rebuilt for sibling sections.
   */
  protected async removeItem(item: ISubjectIntegrationItem, event: Event): Promise<void> {
    event.stopPropagation();

    const route = this.route();
    const stageId = this.stageId();
    const integrationId = this.integrationId();

    if (!route || !stageId || !integrationId || !item.id || this.removingItemId() === item.id) {
      return;
    }

    const confirmed = await this.confirmRemoveItem();

    if (!confirmed) {
      return;
    }

    this.removingItemId.set(item.id);

    try {
      const response = await firstValueFrom(
        this.api
          .delete<RemoveIntegrationItemResponseData>(`${route}/${stageId}/${integrationId}/${item.id}`)
          .pipe(finalize(() => this.removingItemId.set(null))),
      );

      if (!response.success) {
        this.toast.error(response.message);
        return;
      }

      const removedItemId = response.data.item_id ?? item.id;

      this.removeLocalItem(removedItemId);
      this.itemRemoved.emit(removedItemId);
      this.expanded.set(true);
      this.refreshCalculationTotals();
      this.toast.success(response.message);
    } catch {
      return;
    }
  }

  /*
   * Add subjects flow
   *
   * The modal is intentionally presentational. This component fetches available
   * subjects, opens the modal with those subjects, and persists the selected
   * payload after the modal closes.
   */
  protected async openAddSubjectsModal(event: Event): Promise<void> {
    event.stopPropagation();

    const route = this.route();
    const stageId = this.stageId();
    const integrationId = this.integrationId();
    const gradeId = this.gradeId();
    const mode = this.mode();

    if (!route || !stageId || !integrationId) {
      return;
    }

    if (mode === 'grade' && !gradeId) {
      return;
    }

    const availableSubjects = await this.fetchAvailableSubjects(route, stageId, integrationId, mode, gradeId);

    if (!availableSubjects) {
      return;
    }

    const result = await this.modal.open<
      AddIntegrationSubjectsModalData,
      AddIntegrationSubjectsModalResult
    >({
      component: AddIntegrationSubjectsModalComponent,
      title: this.translate.instant('planning.study-plan-integration-items.add-subjects'),
      description: this.translate.instant(
        'planning.study-plan-integration-items.messages.add-subjects-description',
      ),
      size: 'lg',
      data: {
        mode,
        title: this.title(),
        subjects: availableSubjects,
      },
    });

    if (!result?.saved || !result.payload.items.length) {
      return;
    }

    await this.storeSelectedSubjects(route, stageId, integrationId, result);
  }

  private async fetchAvailableSubjects(
    route: string,
    stageId: number,
    integrationId: number,
    mode: 'grade' | 'crossover',
    gradeId: number | null,
  ): Promise<AvailableStageSubject[] | null> {
    const queryParams = new URLSearchParams({ mode });

    if (mode === 'grade' && gradeId !== null) {
      queryParams.set('grade_id', String(gradeId));
    }

    const url = `${route}/${stageId}/${integrationId}/available-subjects?${queryParams.toString()}`;

    this.loadingAvailableSubjects.set(true);

    try {
      const response = await firstValueFrom(
        this.api
          .get<AvailableSubjectsResponseData>(url)
          .pipe(finalize(() => this.loadingAvailableSubjects.set(false))),
      );

      if (!response.success) {
        this.toast.error(response.message);
        return null;
      }

      return response.data.subjects ?? [];
    } catch {
      return null;
    }
  }

  private async storeSelectedSubjects(
    route: string,
    stageId: number,
    integrationId: number,
    result: AddIntegrationSubjectsModalResult,
  ): Promise<void> {
    this.savingSubjects.set(true);

    try {
      const response = await firstValueFrom(
        this.api
          .post<StoreIntegrationItemsResponseData>(
            `${route}/${stageId}/${integrationId}`,
            result.payload,
          )
          .pipe(finalize(() => this.savingSubjects.set(false))),
      );

      if (!response.success) {
        this.toast.error(response.message);
        return;
      }

      const items = response.data.items ?? [];

      this.appendCreatedItems(items);
      this.itemsChanged.emit(items);
      this.expanded.set(true);
      this.toast.success(response.message);
    } catch {
      return;
    }
  }

  private appendCreatedItems(items: ISubjectIntegrationItem[]): void {
    if (!items.length) {
      return;
    }

    this.addedItems.update((current) => this.mergeItems(current, items));
    this.refreshCalculationTotals();
  }

  private async confirmRemoveItem(): Promise<boolean> {
    const confirmed = await this.modal.open<
      {
        message: string;
        confirmLabel: string;
        cancelLabel: string;
        type: 'danger';
      },
      boolean
    >({
      component: SklConfirmModal,
      title: this.translate.instant('planning.study-plan-integration-items.confirm-remove.title'),
      data: {
        message: this.translate.instant('planning.study-plan-integration-items.confirm-remove.message'),
        confirmLabel: this.translate.instant(
          'planning.study-plan-integration-items.confirm-remove.confirm',
        ),
        cancelLabel: this.translate.instant('common.cancel'),
        type: 'danger',
      },
      size: 'sm',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    return confirmed === true;
  }

  private removeLocalItem(itemId: number): void {
    this.addedItems.update((items) => items.filter((item) => item.id !== itemId));
    this.removedItemIds.update((current) => {
      const next = new Set(current);
      next.add(itemId);

      return next;
    });
  }

  private buildCalculationPayload(): UpdateCalculationPayload {
    return {
      items: this.sectionItems().map((item) => ({
        id: item.id,
        final_weight: this.normalizePayloadWeight(item.final_weight),
        failure_blocking: item.failure_blocking,
        enrollment_dependent: item.enrollment_dependent,
        term_weights: (item.term_weights ?? []).map((termWeight) => ({
          id: termWeight.id,
          study_plan_term_id: termWeight.study_plan_term_id,
          weight: this.normalizePayloadWeight(termWeight.weight),
        })),
      })),
    };
  }

  private normalizePayloadWeight(value: unknown): number {
    const numericValue = Number(value);

    if (Number.isNaN(numericValue)) {
      return 0;
    }

    const percentageAwareValue = numericValue > 1 ? numericValue / 100 : numericValue;
    const clampedValue = Math.min(Math.max(percentageAwareValue, 0), 1);

    return Math.round(clampedValue * 100) / 100;
  }

  private replaceSectionItems(items: ISubjectIntegrationItem[]): void {
    if (!items.length) {
      return;
    }

    const updatedItemsById = new Map(items.map((item) => [item.id, item]));
    const inputItemIds = new Set(this.items().map((item) => item.id));

    for (const item of this.items()) {
      const updatedItem = updatedItemsById.get(item.id);

      if (!updatedItem) {
        continue;
      }

      Object.assign(item, this.cloneItem(updatedItem));
    }

    this.addedItems.update((current) => {
      const updatedAddedItems = current.map((item) => {
        const updatedItem = updatedItemsById.get(item.id);

        return updatedItem ? this.cloneItem(updatedItem) : item;
      });

      const addedItemIds = new Set(updatedAddedItems.map((item) => item.id));

      for (const updatedItem of items) {
        if (inputItemIds.has(updatedItem.id) || addedItemIds.has(updatedItem.id)) {
          continue;
        }

        updatedAddedItems.push(updatedItem);
      }

      return this.mergeItems(updatedAddedItems, []);
    });
  }

  private mergeItems(
    currentItems: ISubjectIntegrationItem[],
    newItems: ISubjectIntegrationItem[],
  ): ISubjectIntegrationItem[] {
    const itemsById = new Map<number, ISubjectIntegrationItem>();

    for (const item of currentItems) {
      itemsById.set(item.id, item);
    }

    for (const item of newItems) {
      itemsById.set(item.id, item);
    }

    return [...itemsById.values()].sort((left, right) => {
      const orderDiff = Number(left.order ?? 0) - Number(right.order ?? 0);

      return orderDiff || left.id - right.id;
    });
  }

  protected option(name: string): ScreenOptionItem | null {
    return this.options().find((item) => item.name === name) ?? null;
  }

  protected subjectName(item: ISubjectIntegrationItem): string {
    return item?.stage_subject?.subject?.name ?? '—';
  }

  protected subjectCode(item: ISubjectIntegrationItem): string | null {
    return item?.stage_subject?.subject?.code ?? null;
  }

  protected getItemTermWeight(item: ISubjectIntegrationItem, termId: number): string | number | null {
    return (
      item?.term_weights?.find((weight) => weight.study_plan_term_id === termId)?.weight ??
      null
    );
  }

  protected getItemTermWeightEntry(
    item: ISubjectIntegrationItem,
    termId: number,
  ): ISubjectIntegrationItemTermWeight | null {
    return item?.term_weights?.find((weight) => weight.study_plan_term_id === termId) ?? null;
  }

  protected getTotalWeight(id: string | number): number {
    return this.weightTotals().find((total) => total.id === id)?.total ?? 0;
  }

  protected canEditRow(row: StudyPlanIntegrationDisplayRow): boolean {
    return this.editing() && !row.locked;
  }

  protected updateBooleanRule(
    item: ISubjectIntegrationItem,
    rule: 'enrollment_dependent' | 'failure_blocking',
    event: Event,
  ): void {
    item[rule] = (event.target as HTMLInputElement).checked;
  }

  protected updateNumericValue(
    item: ISubjectIntegrationItem,
    property: 'final_weight',
    event: Event,
  ): void {
    const input = event.target as HTMLInputElement;
    const temporaryValue = this.parseTemporaryWeightInput(input.value);

    item[property] = temporaryValue;
    this.refreshCalculationTotals();
  }

  protected normalizeNumericValue(
    item: ISubjectIntegrationItem,
    property: 'final_weight',
    event: Event,
  ): void {
    const input = event.target as HTMLInputElement;
    const normalizedValue = this.normalizeWeightInput(input.value);

    item[property] = normalizedValue;
    input.value = typeof normalizedValue === 'number' ? normalizedValue.toFixed(2) : normalizedValue;
    this.refreshCalculationTotals();
  }

  protected updateTermWeight(termWeight: ISubjectIntegrationItemTermWeight, event: Event): void {
    const input = event.target as HTMLInputElement;
    const temporaryValue = this.parseTemporaryWeightInput(input.value);

    termWeight.weight = temporaryValue;
    this.refreshCalculationTotals();
  }

  protected normalizeTermWeight(
    termWeight: ISubjectIntegrationItemTermWeight,
    event: Event,
  ): void {
    const input = event.target as HTMLInputElement;
    const normalizedValue = this.normalizeWeightInput(input.value);

    termWeight.weight = normalizedValue;
    input.value = typeof normalizedValue === 'number' ? normalizedValue.toFixed(2) : normalizedValue;
    this.refreshCalculationTotals();
  }

  private createCalculationSnapshot(): void {
    this.calculationSnapshot = this.displayItems().map((row) => this.cloneItem(row.item));
  }

  private restoreCalculationSnapshot(): void {
    if (!this.calculationSnapshot) {
      return;
    }

    const snapshotById = new Map(this.calculationSnapshot.map((item) => [item.id, item]));

    for (const row of this.displayItems()) {
      const snapshot = snapshotById.get(row.item?.id);

      if (!snapshot) {
        continue;
      }

      Object.assign(row.item, this.cloneItem(snapshot));
    }

    this.refreshCalculationTotals();
  }

  private cloneItem<T>(item: T): T {
    return JSON.parse(JSON.stringify(item));
  }

  /*
   * Weight normalization
   *
   * During input, keep what the user types so whole percentages such as `55`
   * are possible. On blur and before payload creation, normalize values into
   * the backend contract range `0..1`.
   */
  private parseTemporaryWeightInput(value: string): string | number {
    const trimmedValue = value.trim();

    if (trimmedValue === '') {
      return '';
    }

    const numericValue = Number(trimmedValue);

    if (Number.isNaN(numericValue)) {
      return '';
    }

    return numericValue;
  }

  private normalizeWeightInput(value: string): string | number {
    const trimmedValue = value.trim();

    if (trimmedValue === '') {
      return '';
    }

    const numericValue = Number(trimmedValue);

    if (Number.isNaN(numericValue)) {
      return '';
    }

    const percentageAwareValue = numericValue > 1 ? numericValue / 100 : numericValue;
    const clampedValue = Math.min(Math.max(percentageAwareValue, 0), 1);

    return Math.round(clampedValue * 100) / 100;
  }

  private refreshCalculationTotals(): void {
    this.calculationVersion.update((current) => current + 1);
  }
}
