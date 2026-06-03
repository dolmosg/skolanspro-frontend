import { CommonModule } from '@angular/common';
import {
  Component,
  OnChanges,
  SimpleChanges,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { ScreenOptionItem } from '@shared/interfaces/configuration.interfaces';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';
import { FormErrorComponent } from '@shared/ui/form-error/form-error';

type TermTimelineStep = 'configuration' | 'capture' | 'review' | 'close';
type TermTimelineStepState = 'done' | 'current' | 'pending';

export interface IStudyPlanTermStatus {
  id: number;
  name: string;
  translation: string;
  css_class: string | null;
  active: boolean;
  order: number;
}

export interface IStudyPlanTermType {
  id: number;
  name: string;
  translation: string;
  active: boolean;
  order: number;
}

export interface IStudyPlanDescriptiveSheetType {
  id: number;
  name: string;
  translation: string;
  active: boolean;
  order: number;
}

export interface IStudyPlanTermDetail {
  id: number;
  study_plan_stage_id: number;
  code: string;
  name: string;
  alternate_name: string | null;
  start_date: string;
  end_date: string;
  review_date: string | null;
  exemption: boolean;
  attendance: boolean;
  comments: boolean;
  term_status_id: number;
  term_type_id: number;
  descriptive_sheet_type_id: number | null;
  order: number;
  status?: IStudyPlanTermStatus | null;
  type?: IStudyPlanTermType | null;
  descriptive_sheet_type?: IStudyPlanDescriptiveSheetType | null;
}

type StudyPlanTermMode = 'view' | 'edit' | 'create';

@Component({
  selector: 'app-study-plan-term',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    UiButtonComponent,
    UiIconComponent,
    FormErrorComponent,
  ],
  templateUrl: './study-plan-term.component.html',
  styleUrl: './study-plan-term.component.scss',
})
export class StudyPlanTermComponent extends SkolansBaseComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  readonly term = input<IStudyPlanTermDetail | null>(null);
  readonly stageId = input<number | null>(null);
  readonly creating = input(false);
  readonly route = input<string | null>(null);

  readonly termOptions = input<ScreenOptionItem[]>([]);
  readonly termStatuses = input<IStudyPlanTermStatus[]>([]);
  readonly termTypes = input<IStudyPlanTermType[]>([]);
  readonly descriptiveSheetTypes = input<IStudyPlanDescriptiveSheetType[]>([]);

  readonly back = output<void>();
  readonly saved = output<void>();

  protected readonly saving = signal(false);
  protected readonly mode = signal<StudyPlanTermMode>('view');

  protected readonly form = this.fb.group({
    study_plan_stage_id: [null as number | null, [Validators.required]],
    code: ['', [Validators.required, Validators.maxLength(10)]],
    name: ['', [Validators.required, Validators.maxLength(45)]],
    alternate_name: ['', [Validators.maxLength(45)]],
    start_date: ['', [Validators.required]],
    end_date: ['', [Validators.required]],
    review_date: ['', [Validators.required]],
    exemption: [false],
    attendance: [true],
    comments: [false],
    term_status_id: [null as number | null, [Validators.required]],
    term_type_id: [null as number | null, [Validators.required]],
    descriptive_sheet_type_id: [null as number | null],
    order: [0, [Validators.required, Validators.min(0)]],
  });

  protected readonly title = computed(() => {
    if (this.mode() === 'create') {
      return 'planning.study-plan-stage-terms.add';
    }

    const term = this.term();

    return term?.code || term?.name || '';
  });

  protected readonly canCreate = computed(() => {
    return this.termOptions().some((option) => option.name === 'add');
  });

  protected readonly canUpdate = computed(() => {
    return this.termOptions().some((option) => option.name === 'update');
  });

  protected readonly canDelete = computed(() => {
    return this.termOptions().some((option) => option.name === 'delete');
  });

  protected readonly updateOption = computed(() => {
    return this.termOptions().find((option) => option.name === 'update') ?? null;
  });

  protected readonly deleteOption = computed(() => {
    return this.termOptions().find((option) => option.name === 'delete') ?? null;
  });

  private readonly termStatusOrder: Record<string, number> = {
    configuration: 0,
    open: 1,
    'in-review': 2,
    closed: 3,
  };

  private readonly timelineStepOrder: Record<TermTimelineStep, number> = {
    configuration: 0,
    capture: 1,
    review: 2,
    close: 3,
  };

  protected timelineStepState(step: TermTimelineStep): TermTimelineStepState {
    const statusName = this.term()?.status?.name ?? 'configuration';
    const currentOrder = this.termStatusOrder[statusName] ?? 0;
    const stepOrder = this.timelineStepOrder[step];

    if (statusName === 'closed') {
      return 'done';
    }

    if (currentOrder > stepOrder) {
      return 'done';
    }

    if (currentOrder === stepOrder) {
      return 'current';
    }

    return 'pending';
  }

  protected timelineStepIcon(step: TermTimelineStep): string {
    const state = this.timelineStepState(step);

    if (state === 'done') {
      return 'check';
    }

    if (state === 'current') {
      return 'clock';
    }

    return 'circle-help';
  }

  protected timelineStepLabel(step: TermTimelineStep): string {
    const state = this.timelineStepState(step);

    if (state === 'done') {
      return 'planning.study-plan-stage-terms.timeline.completed';
    }

    if (state === 'current') {
      return 'planning.study-plan-stage-terms.timeline.current';
    }

    return 'planning.study-plan-stage-terms.timeline.pending';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['creating'] || changes['term'] || changes['stageId']) {
      this.syncState();
    }
  }

  protected syncState(): void {
    if (this.creating()) {
      this.mode.set('create');
      this.resetFormForCreate();
      return;
    }

    const term = this.term();

    if (term) {
      this.mode.set('view');
      this.patchForm(term);
      return;
    }

    this.mode.set('view');
    this.form.reset();
  }

  protected resetFormForCreate(): void {
    this.form.reset({
      study_plan_stage_id: this.stageId(),
      code: '',
      name: '',
      alternate_name: '',
      start_date: '',
      end_date: '',
      review_date: '',
      exemption: false,
      attendance: true,
      comments: false,
      term_status_id: null,
      term_type_id: null,
      descriptive_sheet_type_id: null,
      order: 0,
    });
  }

  protected patchForm(term: IStudyPlanTermDetail): void {
    this.form.patchValue({
      study_plan_stage_id: term.study_plan_stage_id,
      code: term.code,
      name: term.name,
      alternate_name: term.alternate_name ?? '',
      start_date: this.toDateInputValue(term.start_date),
      end_date: this.toDateInputValue(term.end_date),
      review_date: this.toDateInputValue(term.review_date),
      exemption: term.exemption,
      attendance: term.attendance,
      comments: term.comments,
      term_status_id: term.term_status_id,
      term_type_id: term.term_type_id,
      descriptive_sheet_type_id: term.descriptive_sheet_type_id,
      order: term.order,
    });
  }

  protected edit(): void {
    if (!this.canUpdate() || !this.term()) {
      return;
    }

    this.mode.set('edit');
  }

  protected cancel(): void {
    if (this.mode() === 'edit') {
      const term = this.term();

      if (term) {
        this.patchForm(term);
        this.mode.set('view');
        return;
      }
    }

    this.back.emit();
  }

  protected save(): void {
    const route = this.route();

    if (!route) {
      return;
    }

    if (this.mode() === 'create' && !this.canCreate()) {
      return;
    }

    if (this.mode() === 'edit' && !this.canUpdate()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);

    if (this.mode() === 'create') {
      this.executeSilentRequest(
        this.api.post(route, this.form.getRawValue()),
        () => {
          this.saving.set(false);
          this.saved.emit();
        },
        () => {
          this.saving.set(false);
        },
      );

      return;
    }

    const term = this.term();

    if (!term) {
      this.saving.set(false);
      return;
    }

    this.executeSilentRequest(
      this.api.put(`${route}/${term.id}`, this.form.getRawValue()),
      () => {
        this.saving.set(false);
        this.saved.emit();
      },
      () => {
        this.saving.set(false);
      },
    );
  }

  protected async remove(): Promise<void> {
    const route = this.route();
    const term = this.term();

    if (!route || !term || !this.canDelete()) {
      return;
    }

    const confirmed = await this.confirmDelete(
      'planning.study-plan-stage-terms.delete',
      'planning.study-plan-stage-terms.messages.confirm-delete',
    );

    if (!confirmed) {
      return;
    }

    this.executeSilentRequest(this.api.delete(`${route}/${term.id}`), () => {
      this.saved.emit();
    });
  }

  protected isViewMode(): boolean {
    return this.mode() === 'view';
  }

  protected isFormMode(): boolean {
    return this.mode() === 'edit' || this.mode() === 'create';
  }

  private toDateInputValue(value: string | null): string {
    return value ? value.slice(0, 10) : '';
  }
}
