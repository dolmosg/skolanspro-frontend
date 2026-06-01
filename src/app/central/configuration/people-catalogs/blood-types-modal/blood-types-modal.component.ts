import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, DestroyRef, ElementRef, computed, effect, inject, input, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { UiButtonComponent } from '../../../../shared/ui/ui-button/ui-button';
import { SklModalService } from '../../../../shared/services/skl-modal-service';
import { FormErrorComponent } from '../../../../shared/ui/form-error/form-error';

export interface IBloodTypeModalData {
  id?: number;
  name?: string;
}

export interface IBloodTypeModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload: {
    name: string;
  };
}

@Component({
  selector: 'app-blood-types-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, UiButtonComponent, FormErrorComponent],
  templateUrl: './blood-types-modal.component.html',
  styleUrl: './blood-types-modal.component.scss',
})
export class BloodTypesModalComponent implements AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(SklModalService);
  private readonly destroyRef = inject(DestroyRef);

  readonly data = input<IBloodTypeModalData | null>(null);

  protected readonly isEdit = computed(() => !!this.data()?.id);

  @ViewChild('nameInput') private readonly nameInput?: ElementRef<HTMLInputElement>;

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(45)]],
  });

  constructor() {
    effect(() => {
      const item = this.data();

      this.form.reset({
        name: item?.name ?? '',
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
    this.modal.close<IBloodTypeModalResult>({
      saved: false,
      mode: this.isEdit() ? 'edit' : 'create',
      payload: this.form.getRawValue(),
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.modal.close<IBloodTypeModalResult>({
      saved: true,
      mode: this.isEdit() ? 'edit' : 'create',
      payload: this.form.getRawValue(),
    });
  }
}
