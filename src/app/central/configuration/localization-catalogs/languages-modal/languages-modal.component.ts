import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, DestroyRef, ElementRef, computed, effect, inject, input, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { UiButtonComponent } from '../../../../shared/ui/ui-button/ui-button';
import { SklModalService } from '../../../../shared/services/skl-modal-service';
import { FormErrorComponent } from '../../../../shared/ui/form-error/form-error';
import { SkSelectComponent } from '../../../../shared/ui/sk-select/sk-select.component';

export interface ILanguageModalData {
  id?: number;
  name?: string;
  label?: string;
  code?: string;
  direction?: 'ltr' | 'rtl';
  shorthand?: string;
  active?: boolean | number;
  order?: number;
}

export interface ILanguageModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload: {
    name: string;
    label: string;
    code: string;
    direction: 'ltr' | 'rtl';
    shorthand: string;
    active: boolean;
    order: number;
  };
}

@Component({
  selector: 'app-languages-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, UiButtonComponent, FormErrorComponent, SkSelectComponent],
  templateUrl: './languages-modal.component.html',
  styleUrl: './languages-modal.component.scss',
})
export class LanguagesModalComponent implements AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(SklModalService);
  private readonly destroyRef = inject(DestroyRef);

  readonly data = input<ILanguageModalData | null>(null);

  protected readonly isEdit = computed(() => !!this.data()?.id);

  /** Helper base key for translations */
  protected readonly helper = 'configuration.languages.translation';

  protected readonly directionOptions = [
    { id: 'ltr', label: 'configuration.languages.options.direction.ltr' },
    { id: 'rtl', label: 'configuration.languages.options.direction.rtl' },
  ];

  @ViewChild('nameInput') private readonly nameInput?: ElementRef<HTMLInputElement>;

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(45)]],
    label: ['', [Validators.required, Validators.maxLength(128)]],
    code: ['', [Validators.required, Validators.maxLength(45)]],
    direction: ['ltr' as 'ltr' | 'rtl', [Validators.required]],
    shorthand: ['', [Validators.required, Validators.maxLength(45)]],
    active: [true, [Validators.required]],
    order: [0, [Validators.required]],
  });

  constructor() {
    effect(() => {
      const item = this.data();

      this.form.reset({
        name: item?.name ?? '',
        label: item?.label ?? '',
        code: item?.code ?? '',
        direction: item?.direction ?? 'ltr',
        shorthand: item?.shorthand ?? '',
        active: item?.active === undefined ? true : !!item.active,
        order: item?.order ?? 0,
      });
    });
  }

  ngAfterViewInit(): void {
    const timer = window.setTimeout(() => {
      this.nameInput?.nativeElement.focus();
    });

    this.destroyRef.onDestroy(() => window.clearTimeout(timer));
  }

  protected onCancel(): void {
    this.modal.close<ILanguageModalResult>({
      saved: false,
      mode: this.isEdit() ? 'edit' : 'create',
      payload: this.buildPayload(),
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.modal.close<ILanguageModalResult>({
      saved: true,
      mode: this.isEdit() ? 'edit' : 'create',
      payload: this.buildPayload(),
    });
  }

  protected onNameChange(value: string): void {
    const v = value?.trim();

    if (!v) {
      this.form.patchValue({ label: '' });
      return;
    }

    this.form.patchValue({
      label: `${this.helper}.${v}`,
    });
  }

  private buildPayload(): ILanguageModalResult['payload'] {
    const value = this.form.getRawValue();

    return {
      ...value,
      direction: value.direction as 'ltr' | 'rtl',
      active: !!value.active,
      order: Number(value.order),
    };
  }
}
