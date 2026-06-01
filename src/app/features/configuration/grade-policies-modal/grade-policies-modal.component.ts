import { Component, computed, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { SklModalService } from '@shared/services/skl-modal-service';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

export interface IGradePolicyItem {
  id: number;
  name: string;
  translation: string | null;
  configurable: boolean;
  active: boolean;
  order: number;
}

export interface IGradePolicyModalData {
  title: string;
  collectionKey: string;
  item: IGradePolicyItem | null;
  order: number;
}

export interface IGradePolicyModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload: {
    name: string;
    translation: string | null;
    configurable: boolean;
    active: boolean;
    order: number;
  };
}

@Component({
  selector: 'app-grade-policies-modal',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule, UiButtonComponent],
  templateUrl: './grade-policies-modal.component.html',
  styleUrl: './grade-policies-modal.component.scss',
})
export class GradePoliciesModalComponent {
  readonly data = input.required<IGradePolicyModalData>();

  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(SklModalService);

  protected readonly isEdit = computed(() => !!this.data().item);

  protected readonly helper = computed(() => {
    return `configuration.${this.data().collectionKey}.translation`;
  });

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(45)]],
    translation: ['', [Validators.maxLength(200)]],
    configurable: [false, [Validators.required]],
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
      configurable: item.configurable,
      active: item.active,
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.modal.close<IGradePolicyModalResult>({
      saved: true,
      mode: this.isEdit() ? 'edit' : 'create',
      payload: this.buildPayload(),
    });
  }

  protected onCancel(): void {
    this.modal.close(null);
  }

  private buildPayload(): IGradePolicyModalResult['payload'] {
    const value = this.form.getRawValue();

    return {
      name: value.name.trim(),
      translation: value.translation.trim() || null,
      configurable: value.configurable,
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