import { Component, computed, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { SklModalService } from '@shared/services/skl-modal-service';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

export interface IStudyplanStructureItem {
  id: number;
  name: string;
  translation: string | null;
  stages: number;
  stage_name: string | null;
  active: boolean;
  order: number;
}

export interface IStudyplanStructureModalData {
  title: string;
  collectionKey: string;
  item: IStudyplanStructureItem | null;
  order: number;
}

export interface IStudyplanStructureModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload: {
    name: string;
    translation: string | null;
    stages: number;
    stage_name: string | null;
    active: boolean;
    order: number;
  };
}

@Component({
  selector: 'app-study-plan-structure-modal',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule, UiButtonComponent],
  templateUrl: './study-plan-strucuture-modal.component.html',
  styleUrl: './study-plan-strucuture-modal.component.scss',
})
export class StudyPlanStructureModalComponent {
  readonly data = input.required<IStudyplanStructureModalData>();

  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(SklModalService);

  protected readonly isEdit = computed(() => !!this.data().item);

  protected readonly helper = computed(() => {
    return `configuration.${this.data().collectionKey}.translation`;
  });

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(45)]],
    translation: ['', [Validators.maxLength(200)]],
    stages: [1, [Validators.required, Validators.min(1), Validators.max(12)]],
    stage_name: ['', [Validators.maxLength(45)]],
    active: [true, [Validators.required]],
  });

  constructor() {
    queueMicrotask(() => this.patchForm());
  }

  private patchForm(): void {
    const item = this.data().item;

    if (!item) {
      return;
    }

    this.form.patchValue({
      name: item.name,
      translation: item.translation ?? '',
      stages: item.stages,
      stage_name: item.stage_name ?? '',
      active: item.active,
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.modal.close<IStudyplanStructureModalResult>({
      saved: true,
      mode: this.isEdit() ? 'edit' : 'create',
      payload: this.buildPayload(),
    });
  }

  protected onCancel(): void {
    this.modal.close(null);
  }

  private buildPayload(): IStudyplanStructureModalResult['payload'] {
    const value = this.form.getRawValue();

    return {
      name: value.name.trim(),
      translation: value.translation.trim() || null,
      stages: Number(value.stages),
      stage_name: value.stage_name.trim() || null,
      active: value.active,
      order: this.isEdit()
        ? (this.data().item?.order ?? this.data().order)
        : this.data().order,
    };
  }

  protected onNameChange(event: Event): void {
    const value = (event.target as HTMLInputElement | null)?.value?.trim() ?? '';

    if (this.isEdit()) {
      return;
    }

    if (!value) {
      this.form.controls.translation.setValue('');
      return;
    }

    this.form.controls.translation.setValue(`${this.helper()}.${value}`);
  }
}