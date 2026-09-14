import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import type { ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import type { IGradePolicy } from '@shared/interfaces/configuration.interfaces';
import { FormErrorComponent } from '@shared/ui/form-error/form-error';
import { SkSelectComponent } from '@shared/ui/sk-select/sk-select.component';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';

import type { StudyPlanReportCardItemDto } from '../../study-plan-report-cards.interfaces';

interface GradebookSettingsDto {
  id: number | null;
  gradebook_id: number;
  minimum_grade: string | null;
  passing_grade: string | null;
  decimals: number | null;
  final_decimals: number | null;
  rounding_id: number | null;
  final_rounding_id: number | null;
  calculate_integrations: boolean;
  expand_integrations: boolean;
  show_grade_details: boolean;
  show_total_row: boolean;
  show_total_column: boolean;
  publish_to_parents: boolean;
  null_grade_text: string | null;
}

interface GradebookSettingsCatalogsDto {
  grade_policies: IGradePolicy[];
}

interface GradebookSettingsIndexDataDto {
  settings: GradebookSettingsDto;
  catalogs: GradebookSettingsCatalogsDto;
  options: ScreenOptionItem[];
}

interface GradebookSettingsMutationDataDto {
  settings: GradebookSettingsDto;
}

interface GradebookSettingsPayload {
  minimum_grade: string | null;
  passing_grade: string | null;
  decimals: number | null;
  final_decimals: number | null;
  rounding_id: number | null;
  final_rounding_id: number | null;
  calculate_integrations: boolean;
  expand_integrations: boolean;
  show_grade_details: boolean;
  show_total_row: boolean;
  show_total_column: boolean;
  publish_to_parents: boolean;
  null_grade_text: string | null;
}

@Component({
  selector: 'app-gradebook-settings',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    FormErrorComponent,
    SkSelectComponent,
    UiButtonComponent,
    UiIconComponent,
  ],
  templateUrl: './gradebook-settings.component.html',
  styleUrl: './gradebook-settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GradebookSettingsComponent extends SkolansBaseComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  readonly gradebook = input.required<StudyPlanReportCardItemDto>();
  readonly studyPlanId = input.required<number>();
  readonly route = input.required<string>();
  readonly cancel = output<void>();

  protected readonly settingsLoaded = signal(false);
  protected readonly catalogs = signal<GradebookSettingsCatalogsDto>({ grade_policies: [] });
  protected readonly canUpdate = computed(() => !!this.getScreenOption('update'));
  protected readonly hasIntegrations = computed(
    () =>
      this.gradebook().gradebook_type?.content_types.some(
        (contentType) => contentType.name === 'integrations',
      ) ?? false,
  );
  protected readonly form = this.fb.nonNullable.group({
    minimum_grade: this.fb.control<string | null>(null),
    passing_grade: this.fb.control<string | null>(null),
    decimals: this.fb.control<number | null>(null, [Validators.min(0), Validators.max(255)]),
    final_decimals: this.fb.control<number | null>(null, [Validators.min(0), Validators.max(255)]),
    rounding_id: this.fb.control<number | null>(null),
    final_rounding_id: this.fb.control<number | null>(null),
    calculate_integrations: [false],
    expand_integrations: [false],
    show_grade_details: [false],
    show_total_row: [false],
    show_total_column: [false],
    publish_to_parents: [false],
    null_grade_text: this.fb.control<string | null>(null, [Validators.maxLength(100)]),
  });

  ngOnInit(): void {
    this.loadSettings();
  }

  protected save(): void {
    if (!this.settingsLoaded() || !this.canUpdate() || this.form.invalid || this.loading()) {
      return;
    }

    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    this.executeMutationRequest<GradebookSettingsMutationDataDto>(
      this.api.put(this.settingsUrl(), this.payload()),
      (response) => this.applySettings(response.data.settings),
    );
  }

  private loadSettings(): void {
    this.settingsLoaded.set(false);

    this.executeSilentRequest<GradebookSettingsIndexDataDto>(
      this.api.get(this.settingsUrl()),
      (response) => {
        this.catalogs.set(response.data.catalogs);
        this.setScreenOptions(response.data.options);
        this.applySettings(response.data.settings);
        this.settingsLoaded.set(true);
      },
    );
  }

  private applySettings(settings: GradebookSettingsDto): void {
    this.form.reset(
      {
        minimum_grade: settings.minimum_grade,
        passing_grade: settings.passing_grade,
        decimals: settings.decimals,
        final_decimals: settings.final_decimals,
        rounding_id: settings.rounding_id,
        final_rounding_id: settings.final_rounding_id,
        calculate_integrations: settings.calculate_integrations,
        expand_integrations: settings.expand_integrations,
        show_grade_details: settings.show_grade_details,
        show_total_row: settings.show_total_row,
        show_total_column: settings.show_total_column,
        publish_to_parents: settings.publish_to_parents,
        null_grade_text: settings.null_grade_text,
      },
      { emitEvent: false },
    );
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.applyUpdatePermission();
  }

  private applyUpdatePermission(): void {
    if (this.canUpdate()) {
      this.form.enable({ emitEvent: false });
      return;
    }

    this.form.disable({ emitEvent: false });
  }

  private settingsUrl(): string {
    return `${this.route()}/${this.studyPlanId()}/${this.gradebook().id}`;
  }

  private payload(): GradebookSettingsPayload {
    return this.form.getRawValue();
  }
}
