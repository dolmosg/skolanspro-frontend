import { Component, computed, input, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import { SkSelectComponent } from '@shared/ui/sk-select/sk-select.component';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { StudyPlanConfigurationItem } from '../../study-plan-configuration/study-plan-configuration.component';
import { PercentPipe } from '@angular/common';

interface StudyPlanGradingShowData {
  'grading-setting'?: StudyPlanGradingSetting | null;
  options?: ScreenOptionItem[];
  catalogs?: StudyPlanGradingCatalogs;
}

interface StudyPlanGradingSetting {
  id: number;
  study_plan_id: number;
  grading_scale_id: number | null;
  grade_policy_id: number | null;
  aspect_mode_id: number | null;
  comment_type_id: number | null;
  decimals: number;
  class_percent: string;
  exam_percent: string;
  exemptions: boolean;
  exemption_average: string | null;
  exemption_percent: string | null;
  created_at: string;
  updated_at: string;

  grading_scale?: GradingScaleCatalogItem | null;
  grade_policy?: GradePolicyCatalogItem | null;
  aspect_mode?: CatalogItem | null;
  comment_type?: CatalogItem | null;
}

interface CatalogItem {
  id: number;
  name: string;
  translation?: string | null;
  active?: boolean | number;
  order?: number;
}

interface GradingScaleCatalogItem extends CatalogItem {
  minimum: number;
  maximum: number;
}

interface GradePolicyCatalogItem extends CatalogItem {
  configurable: boolean;
}

interface StudyPlanGradingCatalogs {
  'grading-scales': GradingScaleCatalogItem[];
  'grade-policies': GradePolicyCatalogItem[];
  'aspect-modes': CatalogItem[];
  'comment-types': CatalogItem[];
}

interface StudyPlanGradingUpdateData {
  'grading-setting'?: StudyPlanGradingSetting | null;
}

interface StudyPlanGradingPayload {
  grading_scale_id: number | null;
  grade_policy_id: number | null;
  aspect_mode_id: number | null;
  comment_type_id: number | null;
  decimals: number;
  class_percent: number;
  exam_percent: number;
  exemptions: boolean;
  exemption_average: number | null;
  exemption_percent: number | null;
}

@Component({
  selector: 'app-study-plan-grading',
  imports: [ReactiveFormsModule, TranslatePipe, UiButtonComponent, SkSelectComponent, PercentPipe],
  templateUrl: './study-plan-grading.component.html',
  styleUrl: './study-plan-grading.component.scss',
})
export class StudyPlanGradingComponent extends SkolansBaseComponent implements OnInit {
  readonly studyPlan = input<StudyPlanConfigurationItem | null>(null);
  readonly route = input<string | null>(null);

  protected readonly item = signal<StudyPlanGradingSetting | null>(null);
  protected readonly catalogs = signal<StudyPlanGradingCatalogs>(this.emptyCatalogs());
  protected readonly editing = signal(false);
  protected readonly classPercentPreview = signal(50);
  protected readonly examPercentPreview = signal(50);

  protected readonly canEdit = computed(() => !!this.getScreenOption('update'));
  protected readonly canReset = computed(() => !!this.getScreenOption('reset'));

  protected readonly gradingExplanation = computed(() => {
    const item = this.item();

    if (!item) {
      return '';
    }
    const classPercent = this.formatPercent(item.class_percent);
    const examPercent = this.formatPercent(item.exam_percent);

    return this.translate.instant('planning.study-plan-grading.explanation.calculation', {
      classPercent,
      examPercent,
    });
  });

  protected readonly liveGradingExplanation = computed(() => {
    if (!this.editing()) {
      const item = this.item();

      if (!item) {
        return '';
      }

      return this.buildGradingExplanation(Number(item.class_percent), Number(item.exam_percent));
    }

    return this.buildGradingExplanation(
      this.classPercentPreview() / 100,
      this.examPercentPreview() / 100,
    );
  });

  private readonly fb = new FormBuilder();

  protected readonly form = this.fb.nonNullable.group({
    grading_scale_id: [null as number | null, [Validators.required]],
    grade_policy_id: [null as number | null, [Validators.required]],
    aspect_mode_id: [null as number | null, [Validators.required]],
    comment_type_id: [null as number | null, [Validators.required]],
    decimals: [1, [Validators.required, Validators.min(0), Validators.max(4)]],
    class_percent: [50, [Validators.required, Validators.min(0), Validators.max(100)]],
    exam_percent: [50, [Validators.required, Validators.min(0), Validators.max(100)]],
    exemptions: [false],
    exemption_average: [null as number | null],
    exemption_percent: [null as number | null],
  });

  ngOnInit(): void {
    this.loadGrading();

    this.form.controls.class_percent.valueChanges.subscribe((value) => {
      this.classPercentPreview.set(Number(value ?? 0));
    });

    this.form.controls.exam_percent.valueChanges.subscribe((value) => {
      this.examPercentPreview.set(Number(value ?? 0));
    });
  }

  private loadGrading(): void {
    const route = this.route();

    if (!route) {
      return;
    }

    this.executeSilentRequest<StudyPlanGradingShowData>(this.api.get(route), (res) => {
      const item = res.data['grading-setting'] ?? null;

      this.item.set(item);
      this.catalogs.set(res.data.catalogs ?? this.emptyCatalogs());
      this.setScreenOptions(res.data.options ?? []);

      if (item) {
        this.patchForm(item); // 👈 ESTE ES EL CAMBIO
      }
    });
  }

  private emptyCatalogs(): StudyPlanGradingCatalogs {
    return {
      'grading-scales': [],
      'grade-policies': [],
      'aspect-modes': [],
      'comment-types': [],
    };
  }

  protected startEdit(): void {
    const item = this.item();

    if (!item || !this.canEdit()) {
      return;
    }

    this.patchForm(item);
    this.editing.set(true);
  }

  protected cancelEdit(): void {
    const item = this.item();

    if (item) {
      this.patchForm(item);
    }

    this.editing.set(false);
  }

  protected save(): void {
    const route = this.route();

    if (!route || this.form.invalid || !this.canEdit()) {
      this.form.markAllAsTouched();
      return;
    }

    this.executeMutationRequest<StudyPlanGradingUpdateData>(
      this.api.put(route, this.buildPayload()),
      (res) => {
        const updated = res.data['grading-setting'];

        if (!updated) {
          this.loadGrading();
          return;
        }

        this.item.set(updated);
        this.patchForm(updated);
        this.editing.set(false);
      },
    );
  }

  private patchForm(item: StudyPlanGradingSetting): void {
    const classPercent = Number(item.class_percent) * 100;
    const examPercent = Number(item.exam_percent) * 100;

    this.classPercentPreview.set(classPercent);
    this.examPercentPreview.set(examPercent);
    this.form.reset({
      grading_scale_id: item.grading_scale_id,
      grade_policy_id: item.grade_policy_id,
      aspect_mode_id: item.aspect_mode_id,
      comment_type_id: item.comment_type_id,
      decimals: item.decimals,
      class_percent: classPercent,
      exam_percent: examPercent,
      exemptions: item.exemptions,
      exemption_average: item.exemption_average === null ? null : Number(item.exemption_average),
      exemption_percent:
        item.exemption_percent === null ? null : Number(item.exemption_percent) * 100,
    });
  }

  private buildPayload(): StudyPlanGradingPayload {
    const value = this.form.getRawValue();

    return {
      grading_scale_id: value.grading_scale_id,
      grade_policy_id: value.grade_policy_id,
      aspect_mode_id: value.aspect_mode_id,
      comment_type_id: value.comment_type_id,
      decimals: Number(value.decimals),
      class_percent: Number(value.class_percent) / 100,
      exam_percent: Number(value.exam_percent) / 100,
      exemptions: value.exemptions,
      exemption_average: value.exemption_average === null ? null : Number(value.exemption_average),
      exemption_percent:
        value.exemption_percent === null ? null : Number(value.exemption_percent) / 100,
    };
  }

  protected getCatalogLabel(items: CatalogItem[], id: number | null): string {
    const item = items.find((i) => i.id === id);

    if (!item) return '—';

    return item.translation || item.name || '—';
  }

  private buildGradingExplanation(classPercentValue: number, examPercentValue: number): string {
    const classPercent = this.formatPercent(classPercentValue);
    const examPercent = this.formatPercent(examPercentValue);

    return this.translate.instant('planning.study-plan-grading.explanation.calculation', {
      classPercent,
      examPercent,
    });
  }

  private formatPercent(value: number | string | null): string {
    return `${Math.round(Number(value ?? 0) * 100)}%`;
  }
}
