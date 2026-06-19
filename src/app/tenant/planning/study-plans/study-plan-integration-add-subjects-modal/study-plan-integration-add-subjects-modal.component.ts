import { Component, computed, inject, input, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { SklModalService } from '@shared/services/skl-modal-service';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';

export interface AvailableStageSubject {
  id: number;
  grade_id: number | null;
  order?: number | null;
  subject?: {
    id: number;
    code: string | null;
    name: string;
  } | null;
  grade?: {
    id: number;
    name: string | null;
    description?: string | null;
  } | null;
}

export interface AddIntegrationSubjectPayloadItem {
  stage_subject_id: number;
  final_weight: number;
}

export interface AddIntegrationSubjectsPayload {
  items: AddIntegrationSubjectPayloadItem[];
}

export interface AddIntegrationSubjectsModalData {
  mode: 'grade' | 'crossover';
  title: string;
  subjects: AvailableStageSubject[];
}

export interface AddIntegrationSubjectsModalResult {
  saved: boolean;
  payload: AddIntegrationSubjectsPayload;
}

@Component({
  selector: 'app-study-plan-integration-add-subjects-modal',
  standalone: true,
  imports: [TranslatePipe, UiButtonComponent, UiIconComponent],
  templateUrl: './study-plan-integration-add-subjects-modal.component.html',
  styleUrl: './study-plan-integration-add-subjects-modal.component.scss',
})
export class AddIntegrationSubjectsModalComponent {
  readonly data = input<AddIntegrationSubjectsModalData | null>(null);

  private readonly modal = inject(SklModalService);

  protected readonly selectedSubjectIds = signal<Set<number>>(new Set());
  protected readonly weights = signal<Record<number, number | null>>({});

  protected readonly subjects = computed(() => this.data()?.subjects ?? []);
  protected readonly selectedCount = computed(() => this.selectedSubjectIds().size);
  protected readonly hasSubjects = computed(() => this.subjects().length > 0);
  protected readonly hasInvalidSelection = computed(() => {
    for (const subjectId of this.selectedSubjectIds()) {
      const weight = this.weights()[subjectId];

      if (weight === null || weight === undefined || Number.isNaN(weight)) {
        return true;
      }

      if (weight < 0 || weight > 1) {
        return true;
      }
    }

    return false;
  });
  protected readonly canSave = computed(() => {
    return this.selectedCount() > 0 && !this.hasInvalidSelection();
  });

  protected isSelected(subjectId: number): boolean {
    return this.selectedSubjectIds().has(subjectId);
  }

  protected toggleSubject(subjectId: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;

    this.selectedSubjectIds.update((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(subjectId);
      } else {
        next.delete(subjectId);
      }

      return next;
    });

    this.weights.update((current) => {
      const next = { ...current };

      if (checked) {
        next[subjectId] = next[subjectId] ?? 1;
      } else {
        delete next[subjectId];
      }

      return next;
    });
  }

  protected updateWeight(subjectId: number, event: Event): void {
    const rawValue = (event.target as HTMLInputElement).value.trim();
    const numericValue = rawValue === '' ? null : Number(rawValue);

    this.weights.update((current) => ({
      ...current,
      [subjectId]: numericValue === null || Number.isNaN(numericValue) ? null : numericValue,
    }));
  }

  protected normalizeWeight(subjectId: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const rawValue = input.value.trim();

    if (rawValue === '') {
      this.weights.update((current) => ({
        ...current,
        [subjectId]: null,
      }));
      return;
    }

    const numericValue = Number(rawValue);

    if (Number.isNaN(numericValue)) {
      return;
    }

    const normalizedValue = this.normalizeWeightValue(numericValue);

    this.weights.update((current) => ({
      ...current,
      [subjectId]: normalizedValue,
    }));

    input.value = normalizedValue.toFixed(2);
  }

  protected weightValue(subjectId: number): number | '' {
    const value = this.weights()[subjectId];

    return value ?? '';
  }

  protected subjectName(subject: AvailableStageSubject): string {
    return subject.subject?.name ?? '—';
  }

  protected subjectCode(subject: AvailableStageSubject): string | null {
    return subject.subject?.code ?? null;
  }

  protected gradeLabel(subject: AvailableStageSubject): string | null {
    return subject.grade?.description ?? subject.grade?.name ?? null;
  }

  protected onCancel(): void {
    this.modal.close<AddIntegrationSubjectsModalResult>({
      saved: false,
      payload: { items: [] },
    });
  }

  protected onSave(): void {
    if (!this.canSave()) {
      return;
    }

    const items = [...this.selectedSubjectIds()].map((subjectId) => ({
      stage_subject_id: subjectId,
      final_weight: this.normalizeWeightValue(this.weights()[subjectId] ?? 0),
    }));

    this.modal.close<AddIntegrationSubjectsModalResult>({
      saved: true,
      payload: { items },
    });
  }

  private normalizeWeightValue(value: number): number {
    const percentageAwareValue = value > 1 ? value / 100 : value;

    return Math.min(Math.max(percentageAwareValue, 0), 1);
  }
}
