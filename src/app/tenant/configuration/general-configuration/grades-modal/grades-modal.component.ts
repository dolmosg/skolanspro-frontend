import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { SklModalService } from '@shared/services/skl-modal-service';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

import { IGrade, IGradeLevel } from '../grades/grades.component';

export interface GradesModalData {
  grade?: IGrade | null;
  level: IGradeLevel;
}

export interface GradesModalPayload {
  name: string;
  description: string;
  active: boolean;
  level_id: number;
}

export interface GradesModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload?: GradesModalPayload;
}

@Component({
  selector: 'app-grades-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, UiButtonComponent, TranslatePipe],
  templateUrl: './grades-modal.component.html',
  styleUrl: './grades-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GradesModalComponent {
  private readonly modal = inject(SklModalService);
  private readonly fb = inject(FormBuilder);

  readonly data = input<GradesModalData | null>(null);

  protected readonly grade = computed(() => this.data()?.grade ?? null);
  protected readonly level = computed(() => this.data()?.level ?? null);
  protected readonly isEditMode = computed(() => !!this.grade()?.id);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(45)]],
    description: ['', [Validators.required, Validators.maxLength(100)]],
    active: [true, [Validators.required]],
  });

  constructor() {
    effect(() => {
      const grade = this.grade();

      this.form.reset({
        name: grade?.name ?? '',
        description: grade?.description ?? '',
        active: grade?.active ?? true,
      });
    });
  }

  protected onCancel(): void {
    this.modal.close<GradesModalResult>({
      saved: false,
      mode: this.getMode(),
    });
  }

  protected onSubmit(): void {
    const level = this.level();

    if (!level) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.modal.close<GradesModalResult>({
      saved: true,
      mode: this.getMode(),
      payload: this.buildPayload(level.id),
    });
  }

  private getMode(): 'create' | 'edit' {
    return this.isEditMode() ? 'edit' : 'create';
  }

  private buildPayload(levelId: number): GradesModalPayload {
    const value = this.form.getRawValue();

    return {
      name: value.name.trim(),
      description: value.description.trim(),
      active: value.active,
      level_id: levelId,
    };
  }
}