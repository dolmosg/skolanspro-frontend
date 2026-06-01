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
import { SkSelectComponent } from '../../../../shared/ui/sk-select/sk-select.component';
import {
  IPersonCommunicationCatalogItem,
  IPersonMailModalData,
  IPersonMailModalResult,
} from '../person-communication.interfaces';

@Component({
  selector: 'app-person-mail-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    UiButtonComponent,
    FormErrorComponent,
    SkSelectComponent,
    TranslatePipe,
  ],
  templateUrl: './person-mail-modal.component.html',
  styleUrl: './person-mail-modal.component.scss',
})
export class PersonMailModalComponent implements AfterViewInit {
  @ViewChild('emailInput') protected emailInput?: ElementRef<HTMLInputElement>;

  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(SklModalService);
  private readonly destroyRef = inject(DestroyRef);

  readonly data = input<IPersonMailModalData | null>(null);

  protected readonly mailTypes = computed(() => this.data()?.mailTypes ?? []);
  protected readonly email = computed(() => this.data()?.email ?? null);
  protected readonly personId = computed(() => this.data()?.personId ?? null);
  protected readonly isEdit = computed(() => !!this.email()?.id);

  protected readonly form = this.fb.nonNullable.group({
    mail_type_id: this.fb.control<number | null>(null),
    email: ['', [Validators.required, Validators.email, Validators.maxLength(200)]],
    active: [true, [Validators.required]],
  });

  constructor() {
    effect(() => {
      const email = this.email();

      this.form.reset({
        mail_type_id: email?.mail_type_id ?? null,
        email: email?.email ?? '',
        active: email?.active ?? true,
      });
    });
  }

  ngAfterViewInit(): void {
    const timer = window.setTimeout(() => {
      this.emailInput?.nativeElement.focus();
    });

    this.destroyRef.onDestroy(() => window.clearTimeout(timer));
  }

  protected onCancel(): void {
    this.modal.close(null);
  }

  protected onSubmit(): void {
    if (this.form.invalid || !this.personId()) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.getRawValue();

    this.modal.close<IPersonMailModalResult>({
      saved: true,
      mode: this.isEdit() ? 'edit' : 'create',
      payload: {
        person_id: this.personId()!,
        mail_type_id: payload.mail_type_id,
        email: payload.email,
        active: payload.active,
      },
    });
  }

  protected getMailTypeLabel(type: IPersonCommunicationCatalogItem): string {
    return type.translation || type.description || type.name || '';
  }

  protected readonly mailTypesNormalized = computed(() =>
    this.mailTypes().map((type) => ({
      ...type,
      label: type.translation || type.description || type.name || '',
    })),
  );
}
