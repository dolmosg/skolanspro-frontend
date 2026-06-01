import { Component, computed, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { SklModalService } from '@shared/services/skl-modal-service';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

export interface ISubjectTypeItem {
  id: number;
  name: string;
  translation: string | null;
  can_create: boolean;
  can_remove: boolean;
  automatic: boolean;
  searchable: boolean;
  uses_teams: boolean;
  active: boolean;
  order: number;
}

export interface ISubjectTypeModalData {
  title: string;
  collectionKey: string;
  item: ISubjectTypeItem | null;
  order: number;
}

export interface ISubjectTypeModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload: {
    name: string;
    translation: string | null;
    can_create: boolean;
    can_remove: boolean;
    automatic: boolean;
    searchable: boolean;
    uses_teams: boolean;
    active: boolean;
    order: number;
  };
}

@Component({
  selector: 'app-subject-type-modal',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule, UiButtonComponent],
  templateUrl: './subject-type-modal.component.html',
  styleUrl: './subject-type-modal.component.scss',
})
export class SubjectTypeModalComponent {
  readonly data = input.required<ISubjectTypeModalData>();

  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(SklModalService);

  protected readonly isEdit = computed(() => !!this.data().item);

  protected readonly helper = computed(() => {
    return `configuration.${this.data().collectionKey}.translation`;
  });

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(45)]],
    translation: ['', [Validators.maxLength(200)]],
    can_create: [false, [Validators.required]],
    can_remove: [false, [Validators.required]],
    automatic: [false, [Validators.required]],
    searchable: [false, [Validators.required]],
    uses_teams: [false, [Validators.required]],
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
      can_create: item.can_create,
      can_remove: item.can_remove,
      automatic: item.automatic,
      searchable: item.searchable,
      uses_teams: item.uses_teams,
      active: item.active,
      order: item.order ?? this.data().order,
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.modal.close<ISubjectTypeModalResult>({
      saved: true,
      mode: this.isEdit() ? 'edit' : 'create',
      payload: this.buildPayload(),
    });
  }

  protected onCancel(): void {
    this.modal.close(null);
  }

  private buildPayload(): ISubjectTypeModalResult['payload'] {
    const value = this.form.getRawValue();

    return {
      name: value.name.trim(),
      translation: value.translation.trim() || null,
      can_create: value.can_create,
      can_remove: value.can_remove,
      automatic: value.automatic,
      searchable: value.searchable,
      uses_teams: value.uses_teams,
      active: value.active,
      order: Number(value.order ?? 0),
    };
  }

  protected onNameChange(event: Event): void {
    const value = (event.target as HTMLInputElement | null)?.value?.trim() ?? '';

    if (this.isEdit()) {
      return;
    }

    this.form.controls.translation.setValue(
      value ? `${this.helper()}.${value}` : '',
    );
  }
}