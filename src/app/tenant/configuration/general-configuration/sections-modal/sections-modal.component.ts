import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { SklModalService } from '@shared/services/skl-modal-service';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

import { SkSelectComponent } from '@shared/ui/sk-select/sk-select.component';
import { ISection, ISectionGender } from '../sections/sections.component';

export interface SectionsModalData {
  section?: ISection | null;
  genders: ISectionGender[];
}

export interface SectionsModalPayload {
  name: string;
  description: string | null;
  css_class: string | null;
  active: boolean;
  translation: string | null;
  capital: string;
  gender_id: number | null;
}

export interface SectionsModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload?: SectionsModalPayload;
}

@Component({
  selector: 'app-sections-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, UiButtonComponent, TranslatePipe, SkSelectComponent],
  templateUrl: './sections-modal.component.html',
  styleUrl: './sections-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionsModalComponent {
  private readonly modal = inject(SklModalService);
  private readonly fb = inject(FormBuilder);

  readonly data = input<SectionsModalData | null>(null);

  protected readonly section = computed(() => this.data()?.section ?? null);
  protected readonly genders = computed(() => this.data()?.genders ?? []);
  protected readonly isEditMode = computed(() => !!this.section()?.id);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(45)]],
    description: ['', [Validators.maxLength(100)]],
    css_class: ['', [Validators.maxLength(45)]],
    active: [true, [Validators.required]],
    translation: ['', [Validators.maxLength(128)]],
    capital: ['A', [Validators.required, Validators.maxLength(1)]],
    gender_id: [null as number | null],
  });

  constructor() {
    effect(() => {
      const section = this.section();

      this.form.reset({
        name: section?.name ?? '',
        description: section?.description ?? '',
        css_class: section?.css_class ?? '',
        active: section?.active ?? true,
        translation: section?.translation ?? '',
        capital: section?.capital ?? 'A',
        gender_id: section?.gender_id ?? null,
      });
    });
  }

  protected onCancel(): void {
    this.modal.close<SectionsModalResult>({
      saved: false,
      mode: this.getMode(),
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.modal.close<SectionsModalResult>({
      saved: true,
      mode: this.getMode(),
      payload: this.buildPayload(),
    });
  }

  private getMode(): 'create' | 'edit' {
    return this.isEditMode() ? 'edit' : 'create';
  }

  private buildPayload(): SectionsModalPayload {
    const value = this.form.getRawValue();

    return {
      name: value.name.trim(),
      description: this.nullableTrim(value.description),
      css_class: this.nullableTrim(value.css_class),
      active: value.active,
      translation: this.nullableTrim(value.translation),
      capital: value.capital.trim().toUpperCase(),
      gender_id: value.gender_id,
    };
  }

  private nullableTrim(value: string | null | undefined): string | null {
    const trimmed = value?.trim() ?? '';

    return trimmed.length > 0 ? trimmed : null;
  }
}