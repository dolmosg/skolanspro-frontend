import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, DestroyRef, ElementRef, computed, effect, inject, input, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { UiButtonComponent } from '../../../../shared/ui/ui-button/ui-button';
import { SklModalService } from '../../../../shared/services/skl-modal-service';
import { FormErrorComponent } from '../../../../shared/ui/form-error/form-error';

export interface IInvoiceUseModalData {
  id?: number;
  code?: string;
  name?: string;
}

export interface IInvoiceUseModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload: {
    code: string;
    name: string;
  };
}

@Component({
  selector: 'app-invoice-uses-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, UiButtonComponent, FormErrorComponent],
  templateUrl: './invoice-uses-modal.component.html',
  styleUrl: './invoice-uses-modal.component.scss',
})
export class InvoiceUsesModalComponent implements AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(SklModalService);
  private readonly destroyRef = inject(DestroyRef);

  readonly data = input<IInvoiceUseModalData | null>(null);

  protected readonly isEdit = computed(() => !!this.data()?.id);

  @ViewChild('codeInput') private readonly codeInput?: ElementRef<HTMLInputElement>;

  protected readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(5)]],
    name: ['', [Validators.required, Validators.maxLength(128)]],
  });

  constructor() {
    effect(() => {
      const item = this.data();

      this.form.reset({
        code: item?.code ?? '',
        name: item?.name ?? '',
      });
    });
  }

  ngAfterViewInit(): void {
    const timer = window.setTimeout(() => {
      this.codeInput?.nativeElement.focus();
    });

    this.destroyRef.onDestroy(() => window.clearTimeout(timer));
  }

  protected onCancel(): void {
    this.modal.close<IInvoiceUseModalResult>({
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

    this.modal.close<IInvoiceUseModalResult>({
      saved: true,
      mode: this.isEdit() ? 'edit' : 'create',
      payload: this.buildPayload(),
    });
  }

  private buildPayload(): IInvoiceUseModalResult['payload'] {
    const value = this.form.getRawValue();

    return {
      code: value.code.trim(),
      name: value.name.trim(),
    };
  }
}
