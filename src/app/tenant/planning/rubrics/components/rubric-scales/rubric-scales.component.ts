import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import type { ScreenChildItem } from '@shared/interfaces/access.interfaces';
import type { IRubric, IRubricScale } from '@shared/interfaces/planning.interfaces';
import { FormErrorComponent } from '@shared/ui/form-error/form-error';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

import type { RubricScaleMutationDto, RubricScalesIndexDto } from '../../rubrics.interfaces';

type RubricScaleEditorState = { mode: 'create' } | { mode: 'edit'; rubricScaleId: number };
type RubricScaleMutationPayload = Pick<IRubricScale, 'name' | 'description' | 'color'>;

/**
 * Read-only rubric scale collection.
 *
 * The parent owns the rubric and child metadata. This component owns the
 * collection and child-specific options returned by its GET endpoint only.
 */
@Component({
  selector: 'app-rubric-scales',
  imports: [
    DragDropModule,
    FormErrorComponent,
    NgTemplateOutlet,
    ReactiveFormsModule,
    TranslatePipe,
    UiButtonComponent,
  ],
  templateUrl: './rubric-scales.component.html',
  styleUrl: './rubric-scales.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RubricScalesComponent extends SkolansBaseComponent implements OnInit {
  private readonly pickerFallbackColor = '#000000';

  readonly rubric = input.required<IRubric>();
  readonly child = input.required<ScreenChildItem>();

  protected readonly scales = signal<IRubricScale[]>([]);
  protected readonly loaded = signal(false);
  protected readonly editor = signal<RubricScaleEditorState | null>(null);
  protected readonly scaleForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(70)],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    color: new FormControl<string | null>(null, Validators.maxLength(20)),
  });

  ngOnInit(): void {
    this.loadScales();
  }

  protected pickerColor(): string {
    const value = this.scaleForm.controls.color.value;

    return this.isPickerCompatibleColor(value) ? value : this.pickerFallbackColor;
  }

  protected hasPickerColor(): boolean {
    return this.isPickerCompatibleColor(this.scaleForm.controls.color.value);
  }

  protected setColorFromPicker(event: Event): void {
    const input = event.target;

    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    this.scaleForm.controls.color.setValue(input.value);
  }

  protected startCreate(): void {
    if (this.editor() !== null || this.loading()) {
      return;
    }

    this.resetScaleForm();
    this.editor.set({ mode: 'create' });
  }

  protected startEdit(scale: IRubricScale): void {
    if (this.editor() !== null || this.loading()) {
      return;
    }

    this.scaleForm.reset({
      name: scale.name,
      description: scale.description,
      color: scale.color,
    });
    this.editor.set({ mode: 'edit', rubricScaleId: scale.id });
  }

  protected isEditingScale(rubricScaleId: number): boolean {
    const editor = this.editor();

    return editor?.mode === 'edit' && editor.rubricScaleId === rubricScaleId;
  }

  protected cancelEditor(): void {
    if (this.loading()) {
      return;
    }

    this.editor.set(null);
    this.resetScaleForm();
  }

  protected saveEditor(): void {
    if (this.scaleForm.invalid) {
      this.scaleForm.markAllAsTouched();
      return;
    }

    const editor = this.editor();
    const route = this.child().route;

    if (!editor || !route || this.loading()) {
      return;
    }

    const values = this.scaleForm.getRawValue();
    const payload: RubricScaleMutationPayload = {
      name: values.name,
      description: values.description,
      color: values.color?.trim() || null,
    };
    const contextRoute = `${route}/${this.rubric().id}`;

    if (editor.mode === 'create') {
      this.executeMutationRequest(
        this.api.post<RubricScaleMutationDto>(contextRoute, payload),
        (response) => {
          this.scales.update((scales) =>
            this.sortScales([...scales, response.data.rubric_scale]),
          );
          this.closeEditor();
        },
      );
      return;
    }

    this.executeMutationRequest(
      this.api.put<RubricScaleMutationDto>(`${contextRoute}/${editor.rubricScaleId}`, payload),
      (response) => {
        this.scales.update((scales) =>
          this.sortScales(
            scales.map((scale) =>
              scale.id === response.data.rubric_scale.id
                ? response.data.rubric_scale
                : scale,
            ),
          ),
        );
        this.closeEditor();
      },
    );
  }

  protected reorderScales(event: CdkDragDrop<IRubricScale[]>): void {
    const route = this.child().route;

    if (
      !route ||
      !this.getScreenOption('order') ||
      this.editor() !== null ||
      this.loading() ||
      event.previousIndex === event.currentIndex
    ) {
      return;
    }

    const reorderedScales = [...this.scales()];
    moveItemInArray(reorderedScales, event.previousIndex, event.currentIndex);

    this.executeMutationRequest<Pick<RubricScalesIndexDto, 'rubric_scales'>>(
      this.api.put(`${route}/${this.rubric().id}/order`, {
        ids: reorderedScales.map((scale) => scale.id),
      }),
      (response) => this.scales.set(response.data.rubric_scales),
    );
  }

  protected async deleteScale(scale: IRubricScale): Promise<void> {
    if (this.loading() || this.editor() !== null) {
      return;
    }

    const route = this.child().route;

    if (!route) {
      return;
    }

    const confirmed = await this.confirmDelete(
      'planning.rubric-scales.delete',
      'planning.rubric-scales.messages.confirm-delete',
      { name: scale.name },
    );

    if (!confirmed || this.loading() || this.editor() !== null) {
      return;
    }

    this.executeMutationRequest<Pick<RubricScalesIndexDto, 'rubric_scales'>>(
      this.api.delete(`${route}/${this.rubric().id}/${scale.id}`),
      (response) => this.scales.set(response.data.rubric_scales),
    );
  }

  private loadScales(): void {
    const route = this.child().route;

    if (!route) {
      return;
    }

    this.loaded.set(false);
    this.executeSilentRequest<RubricScalesIndexDto>(
      this.api.get(`${route}/${this.rubric().id}`),
      (response) => {
        this.scales.set(response.data.rubric_scales);
        this.setScreenOptions(response.data.options);
        this.loaded.set(true);
      },
    );
  }

  private closeEditor(): void {
    this.editor.set(null);
    this.resetScaleForm();
  }

  private resetScaleForm(): void {
    this.scaleForm.reset({
      name: '',
      description: '',
      color: null,
    });
  }

  private sortScales(scales: IRubricScale[]): IRubricScale[] {
    return [...scales].sort((left, right) => left.order - right.order || left.id - right.id);
  }

  private isPickerCompatibleColor(value: string | null): value is string {
    return /^#[0-9a-fA-F]{6}$/.test(value ?? '');
  }
}
