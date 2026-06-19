import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';
import { TranslatePipe } from '@ngx-translate/core';
import { ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import { StudyPlanIntegrationItemsDetailComponent } from '../study-plan-integration-items-detail/study-plan-integration-items-detail.component';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { FormErrorComponent } from '@shared/ui/form-error/form-error';
import { SkTextCaseDirective } from 'app/shared/directives/sk-text-mode-case';
import type {
  IStudyPlanStage,
  ISubjectIntegration,
  ISubjectIntegrationItem,
} from '@shared/interfaces/study-plan-interfaces';

export interface StudyPlanIntegrationDetailItem extends Omit<ISubjectIntegration, 'stage' | 'items'> {
  items?: ISubjectIntegrationItem[];
}

interface StudyPlanIntegrationDetailIndexData {
  options?: ScreenOptionItem[];
  integration?: StudyPlanIntegrationDetailItem | null;
  stage?: IStudyPlanStage | null;
}

interface StudyPlanIntegrationMutationData {
  integration?: StudyPlanIntegrationDetailItem | null;
  subject_integration?: StudyPlanIntegrationDetailItem | null;
  integration_id?: number;
}

@Component({
  selector: 'app-study-plan-integration-detail',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    UiIconComponent,
    UiButtonComponent,
    TranslatePipe,
    FormErrorComponent,
    StudyPlanIntegrationItemsDetailComponent,
    SkTextCaseDirective,
  ],
  templateUrl: './study-plan-integration-detail.component.html',
  styleUrl: './study-plan-integration-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudyPlanIntegrationDetailComponent extends SkolansBaseComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  readonly route = input<string | null>(null);
  readonly integrationRoute = input<string | null>(null);
  readonly integrationId = input<number | null>(null);
  readonly integrationSummary = input<StudyPlanIntegrationDetailItem | null>(null);
  readonly integrationOptions = input<ScreenOptionItem[]>([]);

  readonly integrationUpdated = output<StudyPlanIntegrationDetailItem>();
  readonly integrationDeleted = output<number>();

  protected readonly integration = signal<StudyPlanIntegrationDetailItem | null>(null);
  protected readonly stage = signal<IStudyPlanStage | null>(null);
  protected readonly integrationItemOptions = signal<ScreenOptionItem[]>([]);
  protected readonly editingIntegration = signal(false);
  protected readonly savingIntegration = signal(false);
  protected readonly deletingIntegration = signal(false);

  protected readonly integrationForm = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(20)]],
    name: ['', [Validators.required, Validators.maxLength(120)]],
    active: [true],
  });

  protected readonly terms = computed(() => this.stage()?.terms ?? []);

  protected readonly crossoverItems = computed(() => {
    return (this.integration()?.items ?? []).filter((item) => !item.stage_subject?.grade_id);
  });

  protected readonly gradeGroups = computed(() => {
    const grades = [...(this.stage()?.study_plan?.level?.grades ?? [])].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    );

    const itemsByGrade = new Map<number, ISubjectIntegrationItem[]>();

    for (const item of this.integration()?.items ?? []) {
      const gradeId = item.stage_subject?.grade_id;

      if (!gradeId) {
        continue;
      }

      if (!itemsByGrade.has(gradeId)) {
        itemsByGrade.set(gradeId, []);
      }

      itemsByGrade.get(gradeId)!.push(item);
    }

    return grades.map((grade) => ({
      grade,
      items: itemsByGrade.get(grade.id) ?? [],
    }));
  });

  constructor() {
    super();

    effect(() => {
      this.setStudyPlanIntegrationDetailAssistantContext();
    });

    effect(() => {
      this.loadIntegrationDetail();
    });
  }

  ngOnInit(): void {
    this.initRouteMeta();
  }

  protected loadIntegrationDetail(): void {
    const route = this.route();
    const integrationId = this.integrationId();

    if (!route || !integrationId) {
      this.integration.set(this.integrationSummary());
      this.stage.set(null);
      this.setScreenOptions(this.integrationOptions());
      this.integrationItemOptions.set([]);
      return;
    }

    this.executeSilentRequest<StudyPlanIntegrationDetailIndexData>(
      this.api.get(`${route}/${integrationId}`),
      (res) => {
        this.integration.set(res.data.integration ?? this.integrationSummary());
        this.stage.set(res.data.stage ?? null);
        this.setScreenOptions(
          this.integrationOptions().length > 0 ? this.integrationOptions() : res.data.options,
        );
        this.integrationItemOptions.set(res.data.options ?? []);
        this.patchIntegrationForm(this.integration());
      },
      () => {
        this.integration.set(this.integrationSummary());
        this.stage.set(null);
        this.setScreenOptions(this.integrationOptions());
        this.integrationItemOptions.set([]);
        this.patchIntegrationForm(this.integrationSummary());
      },
    );
  }

  protected editIntegration(): void {
    const integration = this.integration() ?? this.integrationSummary();

    if (!integration || !this.getScreenOption('update')) {
      return;
    }

    this.patchIntegrationForm(integration);
    this.editingIntegration.set(true);
  }

  protected cancelIntegrationEdit(): void {
    this.patchIntegrationForm(this.integration() ?? this.integrationSummary());
    this.editingIntegration.set(false);
  }

  protected saveIntegration(): void {
    const route = this.integrationRoute();
    const integration = this.integration() ?? this.integrationSummary();

    if (!route || !integration || !this.getScreenOption('update')) {
      return;
    }

    this.integrationForm.markAllAsTouched();
    this.integrationForm.updateValueAndValidity();

    if (this.integrationForm.invalid) {
      return;
    }

    const rawPayload = this.integrationForm.getRawValue();
    const code = rawPayload.code?.trim() || integration.code;
    const name = rawPayload.name?.trim() || integration.name;
    const payload = {
      code,
      name,
      active: rawPayload.active ?? integration.active,
    };

    this.savingIntegration.set(true);
    this.request(
      this.api.put<StudyPlanIntegrationMutationData>(
        `${route}/${integration.study_plan_stage_id}/${integration.id}`,
        payload,
      ),
    ).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          this.savingIntegration.set(false);
          return;
        }

        this.handleApiSuccess(res);
        const updatedIntegration = res.data.integration ??
          res.data.subject_integration ?? {
            ...integration,
            ...payload,
          };

        this.savingIntegration.set(false);
        this.editingIntegration.set(false);
        this.integration.set(updatedIntegration);
        this.patchIntegrationForm(updatedIntegration);
        this.integrationUpdated.emit(updatedIntegration);
      },
      error: () => {
        this.savingIntegration.set(false);
        this.ignoreHandledRequestError();
      },
    });
  }

  protected async deleteIntegration(): Promise<void> {
    const route = this.integrationRoute();
    const integration = this.integration() ?? this.integrationSummary();

    if (!route || !integration || !this.getScreenOption('delete') || this.deletingIntegration()) {
      return;
    }

    const confirmed = await this.confirmDelete(
      'planning.study-plan-integrations.messages.delete-title',
      'planning.study-plan-integrations.messages.confirm-delete',
    );

    if (!confirmed) {
      return;
    }

    this.deletingIntegration.set(true);
    this.request(
      this.api.delete<StudyPlanIntegrationMutationData>(
        `${route}/${integration.study_plan_stage_id}/${integration.id}`,
      ),
    ).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          this.deletingIntegration.set(false);
          return;
        }

        this.handleApiSuccess(res);
        this.deletingIntegration.set(false);
        this.integrationDeleted.emit(res.data.integration_id ?? integration.id);
      },
      error: () => {
        this.deletingIntegration.set(false);
        this.ignoreHandledRequestError();
      },
    });
  }

  protected onIntegrationItemsAdded(items: ISubjectIntegrationItem[]): void {
    const current = this.integration() ?? this.integrationSummary();

    if (!current || !items.length) {
      return;
    }

    const itemsById = new Map<number, ISubjectIntegrationItem>();

    for (const item of current.items ?? []) {
      itemsById.set(item.id, item);
    }

    for (const item of items) {
      itemsById.set(item.id, item);
    }

    const updatedItems = this.sortIntegrationItems([...itemsById.values()]);

    this.integration.set({
      ...current,
      items: updatedItems,
      items_count: updatedItems.length,
    });
  }

  protected onIntegrationItemRemoved(itemId: number): void {
    const current = this.integration() ?? this.integrationSummary();

    if (!current) {
      return;
    }

    const updatedItems = this.sortIntegrationItems(
      (current.items ?? []).filter((item) => item.id !== itemId),
    );

    this.integration.set({
      ...current,
      items: updatedItems,
      items_count: updatedItems.length,
    });
  }

  private sortIntegrationItems(items: ISubjectIntegrationItem[]): ISubjectIntegrationItem[] {
    return [...items].sort((left, right) => {
      const orderDiff = Number(left.order ?? 0) - Number(right.order ?? 0);

      return orderDiff || left.id - right.id;
    });
  }

  private setStudyPlanIntegrationDetailAssistantContext(): void {
    const integration = this.integration() ?? this.integrationSummary();

    this.setAssistantContext({
      contextId: 'planning.study-plans.integration-detail',
      contextType: 'editor',
      feature: 'study-plan-integration-items',
      entity: 'study-plan-integration',
      mode: integration ? 'selected' : 'empty',
      title: 'planning.study-plan-integrations.title',
      subtitle: 'planning.study-plan-integrations.description',
      data: {
        integrationId: integration?.id ?? null,
        integrationCode: integration?.code ?? null,
        integrationName: integration?.name ?? null,
        integrationActive: integration?.active ?? null,
        stageId: this.stage()?.id ?? null,
        stageName: this.stage()?.name ?? null,
        itemsCount: integration?.items_count ?? 0,
        crossoverItemsCount: this.crossoverItems().length,
        gradeGroupsCount: this.gradeGroups().length,
        termsCount: this.terms().length,
        hasIntegration: Boolean(integration),
        hasControllerRoute: Boolean(this.route()),
      },
    });
  }

  private patchIntegrationForm(integration: StudyPlanIntegrationDetailItem | null): void {
    if (!integration) {
      this.integrationForm.reset({
        code: '',
        name: '',
        active: true,
      });
      return;
    }

    this.integrationForm.patchValue({
      code: integration.code,
      name: integration.name,
      active: integration.active,
    });

    this.integrationForm.updateValueAndValidity();
  }
}
