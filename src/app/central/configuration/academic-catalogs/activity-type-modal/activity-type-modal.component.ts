import { Component, computed, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { SklModalService } from '@shared/services/skl-modal-service';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

export interface IActivityTypeItem {
  id: number;
  name: string;
  translation: string | null;
  gradeable: boolean;
  configurable: boolean;
  icon: string | null;
  active: boolean;
  order: number;
}

export interface IActivityTypeModalData {
  title: string;
  collectionKey: string;
  item: IActivityTypeItem | null;
  order: number;
}

export interface IActivityTypeModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload: {
    name: string;
    translation: string | null;
    gradeable: boolean;
    configurable: boolean;
    icon: string | null;
    active: boolean;
    order: number;
  };
}

@Component({
  selector: 'app-activity-type-modal',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule, UiButtonComponent],
  templateUrl: './activity-type-modal.component.html',
  styleUrl: './activity-type-modal.component.scss',
})
export class ActivityTypeModalComponent {
  readonly data = input.required<IActivityTypeModalData>();

  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(SklModalService);

  protected readonly isEdit = computed(() => !!this.data().item);

  protected readonly helper = computed(() => {
    return `configuration.${this.data().collectionKey}.translation`;
  });

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(45)]],
    translation: ['', [Validators.maxLength(200)]],
    gradeable: [false, [Validators.required]],
    configurable: [false, [Validators.required]],
    icon: ['', [Validators.maxLength(45)]],
    active: [true, [Validators.required]],
    order: [0, [Validators.required, Validators.min(0)]],
  });

  constructor() {
    queueMicrotask(() => this.patchForm());
  }

  private patchForm(): void {
    const item = this.data().item;

    if (!item) {
      this.form.patchValue({
        order: this.data().order,
      });

      return;
    }

    this.form.patchValue({
      name: item.name,
      translation: item.translation ?? '',
      gradeable: item.gradeable,
      configurable: item.configurable,
      icon: item.icon ?? '',
      active: item.active,
      order: item.order ?? this.data().order,
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.modal.close<IActivityTypeModalResult>({
      saved: true,
      mode: this.isEdit() ? 'edit' : 'create',
      payload: this.buildPayload(),
    });
  }

  protected onCancel(): void {
    this.modal.close(null);
  }

  private buildPayload(): IActivityTypeModalResult['payload'] {
    const value = this.form.getRawValue();

    return {
      name: value.name.trim(),
      translation: value.translation.trim() || null,
      gradeable: value.gradeable,
      configurable: value.configurable,
      icon: value.icon.trim() || null,
      active: value.active,
      order: Number(value.order ?? 0),
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