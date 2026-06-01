import { Component, computed, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { SklModalService } from '@shared/services/skl-modal-service';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

export interface ICommunityCatalogItem {
  id: number;
  name: string;
  translation: string | null;
  css_class: string;
  active: boolean;
  order: number;
}

export interface ICommunityModalData {
  title: string;
  collectionKey: string;
  item: ICommunityCatalogItem | null;
}

export interface ICommunityModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload: {
    name: string;
    translation: string | null;
    css_class: string;
    active: boolean;
  };
}

@Component({
  selector: 'app-community-modal',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule, UiButtonComponent],
  templateUrl: './community-modal.component.html',
  styleUrl: './community-modal.component.scss',
})
export class CommunityModalComponent {
  readonly data = input.required<ICommunityModalData>();

  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(SklModalService);

  protected readonly isEdit = computed(() => !!this.data().item);

  protected readonly helper = computed(() => {
    return `configuration.${this.data().collectionKey}.translation`;
  });

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(45)]],
    translation: ['', [Validators.maxLength(100)]],
    css_class: ['secondary', [Validators.required, Validators.maxLength(45)]],
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
      css_class: item.css_class,
      active: item.active,
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.modal.close<ICommunityModalResult>({
      saved: true,
      mode: this.isEdit() ? 'edit' : 'create',
      payload: this.buildPayload(),
    });
  }

  protected onCancel(): void {
    this.modal.close(null);
  }

  private buildPayload(): ICommunityModalResult['payload'] {
    const value = this.form.getRawValue();

    return {
      name: value.name.trim(),
      translation: value.translation.trim() || null,
      css_class: value.css_class.trim(),
      active: value.active,
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
