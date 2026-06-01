import { Component, computed, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { SklModalService } from '@shared/services/skl-modal-service';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

export interface IGroupTypeItem {
  id: number;
  name: string;
  translation: string | null;
  requires_subject: boolean;
  active: boolean;
  order: number;
}

export interface IGroupTypeModalData {
  title: string;
  collectionKey: string;
  item: IGroupTypeItem | null;
  order: number;
}

export interface IGroupTypeModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload: {
    name: string;
    translation: string | null;
    requires_subject: boolean;
    active: boolean;
    order: number;
  };
}

@Component({
  selector: 'app-group-types-modal',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule, UiButtonComponent],
  templateUrl: './group-types-modal.component.html',
  styleUrl: './group-types-modal.component.scss',
})
export class GroupTypesModalComponent {
  readonly data = input.required<IGroupTypeModalData>();

  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(SklModalService);

  protected readonly isEdit = computed(() => !!this.data().item);

  protected readonly helper = computed(() => {
    return `configuration.${this.data().collectionKey}.translation`;
  });

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(45)]],
    translation: ['', [Validators.maxLength(200)]],
    requires_subject: [false, [Validators.required]],
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
      requires_subject: item.requires_subject,
      active: item.active,
      order: item.order ?? this.data().order,
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.modal.close<IGroupTypeModalResult>({
      saved: true,
      mode: this.isEdit() ? 'edit' : 'create',
      payload: this.buildPayload(),
    });
  }

  protected onCancel(): void {
    this.modal.close(null);
  }

  private buildPayload(): IGroupTypeModalResult['payload'] {
    const value = this.form.getRawValue();

    return {
      name: value.name.trim(),
      translation: value.translation.trim() || null,
      requires_subject: value.requires_subject,
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