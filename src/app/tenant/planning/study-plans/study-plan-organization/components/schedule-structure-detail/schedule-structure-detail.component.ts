import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import type { ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import type { IStudyPlanScheduleStructure } from '@shared/interfaces/study-plan-interfaces';
import { FormErrorComponent } from '@shared/ui/form-error/form-error';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';

@Component({
  selector: 'app-schedule-structure-detail',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    FormErrorComponent,
    UiButtonComponent,
    UiIconComponent,
  ],
  templateUrl: './schedule-structure-detail.component.html',
  styleUrl: './schedule-structure-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleStructureDetailComponent extends SkolansBaseComponent {
  private readonly fb = inject(FormBuilder);

  readonly structure = input<IStudyPlanScheduleStructure | null>(null);
  readonly route = input<string | null>(null);
  readonly receivedOptions = input<ScreenOptionItem[]>([], { alias: 'options' });
  readonly saved = output<void>();

  protected readonly editing = signal(false);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
  });

  protected readonly updateOption = computed(() => this.getScreenOption('update'));
  protected readonly updateOptionVariant = computed(() =>
    this.getScreenOptionVariant('update', 'primary'),
  );

  protected readonly segments = computed(() => this.structure()?.segments ?? []);
  protected readonly segmentsCount = computed(() => this.segments().length);
  protected readonly lessonsCount = computed(() =>
    this.segments().reduce((total, segment) => total + (segment.lessons_count ?? 0), 0),
  );
  protected readonly breaksCount = computed(() =>
    this.segments().reduce((total, segment) => total + (segment.breaks_count ?? 0), 0),
  );
  protected readonly blocksCount = computed(() =>
    this.segments().reduce((total, segment) => total + (segment.blocks_count ?? 0), 0),
  );
  protected readonly segmentLabel = computed(() =>
    this.metricTranslationKey(this.segmentsCount(), 'segment', 'segments'),
  );
  protected readonly lessonLabel = computed(() =>
    this.metricTranslationKey(this.lessonsCount(), 'lesson', 'lessons'),
  );
  protected readonly breakLabel = computed(() =>
    this.metricTranslationKey(this.breaksCount(), 'break', 'breaks'),
  );
  protected readonly blockLabel = computed(() =>
    this.metricTranslationKey(this.blocksCount(), 'block', 'blocks'),
  );

  constructor() {
    super();

    effect(() => {
      this.setScreenOptions(this.receivedOptions());
    });

    effect(() => {
      if (!this.editing()) {
        this.patchForm(this.structure());
      }
    });
  }

  protected startEdit(): void {
    const structure = this.structure();

    if (!structure || !this.updateOption()) {
      return;
    }

    this.patchForm(structure);
    this.editing.set(true);
  }

  protected cancelEdit(): void {
    this.patchForm(this.structure());
    this.editing.set(false);
  }

  protected save(): void {
    const route = this.route();
    const structure = this.structure();

    if (!route || !structure || !this.updateOption() || this.saving()) {
      return;
    }

    this.form.markAllAsTouched();
    this.form.updateValueAndValidity();

    if (this.form.invalid) {
      return;
    }

    const payload = {
      name: this.form.getRawValue().name,
    };

    this.saving.set(true);

    this.executeMutationRequest<{ structure: IStudyPlanScheduleStructure }>(
      this.api.put<{ structure: IStudyPlanScheduleStructure }>(
        `${route}/${structure.id}`,
        payload,
      ),
      () => {
        this.editing.set(false);
        this.saved.emit();
      },
      () => {
        this.saving.set(false);
      },
    );
  }

  private patchForm(structure: IStudyPlanScheduleStructure | null): void {
    this.form.reset({
      name: structure?.name ?? '',
    });
  }

  private metricTranslationKey(count: number, singular: string, plural: string): string {
    const metric = count === 1 ? singular : plural;

    return `planning.study-plan-schedule-structures.detail.metrics.${metric}`;
  }
}
