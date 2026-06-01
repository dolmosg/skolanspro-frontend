import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { SklModalService } from '../../../../shared/services/skl-modal-service';
import { FormErrorComponent } from '../../../../shared/ui/form-error/form-error';
import { UiButtonComponent } from '../../../../shared/ui/ui-button/ui-button';

export interface IMailTypeModalData {
  id?: number;
  description?: string;
  translation?: string | null;
  css_class?: string | null;
  order?: number;
  active?: boolean;
}

export interface IMailTypeModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload: {
    description: string;
    translation: string;
  };
}

@Component({
  selector: 'app-mail-type-modal-component',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    UiButtonComponent,
    FormErrorComponent,
    TranslatePipe,
  ],
  templateUrl: './mail-type-modal.component.html',
  styleUrl: './mail-type-modal.component.scss',
})
export class MailTypeModalComponent implements AfterViewInit {
  @ViewChild('nameInput') protected nameInput?: ElementRef<HTMLInputElement>;

  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(SklModalService);
  private readonly destroyRef = inject(DestroyRef);

  readonly data = input<IMailTypeModalData | null>(null);

  protected readonly helper = 'configuration.mail-types.translation';

  protected readonly isEdit = computed(() => !!this.data()?.id);

  protected readonly form = this.fb.nonNullable.group({
    description: ['', [Validators.required, Validators.maxLength(45)]],
    translation: ['', [Validators.required, Validators.maxLength(128)]],
  });

  constructor() {
    effect(() => {
      const mailType = this.data();

      this.form.reset({
        description: mailType?.description ?? '',
        translation: mailType?.translation ?? '',
       
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
    this.modal.close(null);
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.getRawValue();

    this.modal.close<IMailTypeModalResult>({
      saved: true,
      mode: this.isEdit() ? 'edit' : 'create',
      payload: {
        description: payload.description.trim(),
        translation: payload.translation.trim(),
      },
    });
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

    this.form.controls.translation.setValue(`${this.helper}.${value}`);
  }
}