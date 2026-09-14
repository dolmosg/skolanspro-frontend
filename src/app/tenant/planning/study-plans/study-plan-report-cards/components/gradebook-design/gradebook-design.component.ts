import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import type { ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import { SkSelectComponent } from '@shared/ui/sk-select/sk-select.component';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';

import type { StudyPlanReportCardItemDto } from '../../study-plan-report-cards.interfaces';

interface GradebookDesignDto {
  id: number | null; gradebook_id: number; font_size: number | null; name_background_color: string | null; subject_border_color: string | null; show_title: boolean; title_text: string | null; title_text_color: string | null; title_background_color: string | null; title_border_color: string | null; subtitle_text_color: string | null; subtitle_background_color: string | null; grade_text_color: string | null; grade_border_color: string | null; grade_background_color: string | null; total_text: string | null; total_text_color: string | null; total_border_color: string | null; total_alignment: string | null; legend: string | null;
}
interface GradebookDesignIndexDataDto { design: GradebookDesignDto; options: ScreenOptionItem[]; }
interface GradebookDesignMutationDataDto { design: GradebookDesignDto; }
type GradebookDesignPayload = Omit<GradebookDesignDto, 'id' | 'gradebook_id'>;
interface GradebookTotalAlignmentOption {
  value: 'L' | 'C' | 'R';
  translation: string;
}
type GradebookDesignColorControlName =
  | 'name_background_color'
  | 'subject_border_color'
  | 'title_text_color'
  | 'title_background_color'
  | 'title_border_color'
  | 'subtitle_text_color'
  | 'subtitle_background_color'
  | 'grade_text_color'
  | 'grade_border_color'
  | 'grade_background_color'
  | 'total_text_color'
  | 'total_border_color';

@Component({
  selector: 'app-gradebook-design',
  imports: [ReactiveFormsModule, TranslatePipe, SkSelectComponent, UiButtonComponent, UiIconComponent],
  templateUrl: './gradebook-design.component.html',
  styleUrl: './gradebook-design.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GradebookDesignComponent extends SkolansBaseComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly pickerFallbackColor = '#000000';
  readonly gradebook = input.required<StudyPlanReportCardItemDto>();
  readonly studyPlanId = input.required<number>();
  readonly route = input.required<string>();
  readonly cancel = output<void>();
  protected readonly designLoaded = signal(false);
  protected readonly canUpdate = computed(() => !!this.getScreenOption('update'));
  protected readonly totalAlignmentOptions: GradebookTotalAlignmentOption[] = [
    { value: 'L', translation: 'planning.study-plan-report-card-design.alignments.left' },
    { value: 'C', translation: 'planning.study-plan-report-card-design.alignments.center' },
    { value: 'R', translation: 'planning.study-plan-report-card-design.alignments.right' },
  ];
  protected readonly form = this.fb.nonNullable.group({
    font_size: this.fb.control<number | null>(null), name_background_color: this.fb.control<string | null>(null), subject_border_color: this.fb.control<string | null>(null), show_title: true,
    title_text: this.fb.control<string | null>(null, Validators.maxLength(150)), title_text_color: this.fb.control<string | null>(null), title_background_color: this.fb.control<string | null>(null), title_border_color: this.fb.control<string | null>(null),
    subtitle_text_color: this.fb.control<string | null>(null), subtitle_background_color: this.fb.control<string | null>(null), grade_text_color: this.fb.control<string | null>(null), grade_border_color: this.fb.control<string | null>(null), grade_background_color: this.fb.control<string | null>(null),
    total_text: this.fb.control<string | null>(null, Validators.maxLength(150)), total_text_color: this.fb.control<string | null>(null), total_border_color: this.fb.control<string | null>(null), total_alignment: this.fb.control<string | null>(null, Validators.maxLength(20)), legend: this.fb.control<string | null>(null),
  });
  ngOnInit(): void { this.loadDesign(); }
  protected pickerColor(controlName: GradebookDesignColorControlName): string {
    const value = this.form.controls[controlName].value;

    return this.isPickerCompatibleColor(value) ? value : this.pickerFallbackColor;
  }
  protected hasPickerColor(controlName: GradebookDesignColorControlName): boolean {
    return this.isPickerCompatibleColor(this.form.controls[controlName].value);
  }
  protected setColorFromPicker(controlName: GradebookDesignColorControlName, event: Event): void {
    const input = event.target;

    if (!(input instanceof HTMLInputElement)) return;

    this.form.controls[controlName].setValue(input.value);
  }
  protected save(): void { if (!this.designLoaded() || !this.canUpdate() || this.form.invalid || this.loading()) return; this.executeMutationRequest<GradebookDesignMutationDataDto>(this.api.put(this.url(), this.payload()), response => this.applyDesign(response.data.design)); }
  private loadDesign(): void { this.executeSilentRequest<GradebookDesignIndexDataDto>(this.api.get(this.url()), response => { this.setScreenOptions(response.data.options); this.applyDesign(response.data.design); this.designLoaded.set(true); }); }
  private applyDesign(design: GradebookDesignDto): void { const { id: _id, gradebook_id: _gradebookId, ...value } = design; this.form.reset(value, { emitEvent: false }); this.form.markAsPristine(); this.form.markAsUntouched(); if (this.canUpdate()) this.form.enable({ emitEvent: false }); else this.form.disable({ emitEvent: false }); }
  private url(): string { return `${this.route()}/${this.studyPlanId()}/${this.gradebook().id}`; }
  private payload(): GradebookDesignPayload { const value = this.form.getRawValue(); return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, typeof item === 'string' && item === '' ? null : item])) as GradebookDesignPayload; }
  private isPickerCompatibleColor(value: string | null): value is string {
    return /^#[0-9a-fA-F]{6}$/.test(value ?? '');
  }
}
