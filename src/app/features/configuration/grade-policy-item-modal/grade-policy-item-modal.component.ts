import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { SklModalService } from '@shared/services/skl-modal-service';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

export interface GradePolicyItemModalData {
  item?: GradePolicyItemModalItem | null;
  order: number;
}

export interface GradePolicyItemModalItem {
  id?: number;
  grade_policy_id?: number;
  code: string;
  name: string;
  threshold: string | number;
  order: number;
}

export interface GradePolicyItemModalPayload {
  id?: number;
  code: string;
  name: string;
  threshold: number;
  order: number;
}

export interface GradePolicyItemModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload?: GradePolicyItemModalPayload;
}

@Component({
  selector: 'app-grade-policy-item-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, UiButtonComponent, TranslatePipe],
  templateUrl: './grade-policy-item-modal.component.html',
  styleUrl: './grade-policy-item-modal.component.scss',
})
export class GradePolicyItemModalComponent {
  private readonly modal = inject(SklModalService);
  private readonly fb = inject(FormBuilder);

  readonly data = input<GradePolicyItemModalData | null>(null);

  protected readonly item = computed(() => this.data()?.item ?? null);
  protected readonly isEditMode = computed(() => !!this.item()?.id);

  protected readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(5)]],
    name: ['', [Validators.required, Validators.maxLength(128)]],
    threshold: [0, [Validators.required, Validators.min(0), Validators.max(999.99)]],
  });

  constructor() {
    effect(() => {
      const item = this.item();

      this.form.reset({
        code: item?.code ?? '',
        name: item?.name ?? '',
        threshold: Number(item?.threshold ?? 0),
      });
    });
  }

  protected onCancel(): void {
    this.modal.close<GradePolicyItemModalResult>({
      saved: false,
      mode: this.getMode(),
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.modal.close<GradePolicyItemModalResult>({
      saved: true,
      mode: this.getMode(),
      payload: this.buildPayload(),
    });
  }

  private getMode(): 'create' | 'edit' {
    return this.isEditMode() ? 'edit' : 'create';
  }

  private buildPayload(): GradePolicyItemModalPayload {
    const value = this.form.getRawValue();
    const item = this.item();

    return {
      ...(item?.id ? { id: item.id } : {}),
      code: value.code.trim(),
      name: value.name.trim(),
      threshold: Number(value.threshold),
      order: item?.order ?? this.data()?.order ?? 0,
    };
  }
}