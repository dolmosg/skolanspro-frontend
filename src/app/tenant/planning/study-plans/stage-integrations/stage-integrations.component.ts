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
import { TranslatePipe } from '@ngx-translate/core';
import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { ScreenChildItem, ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import type { ISubjectIntegration } from '@shared/interfaces/study-plan-interfaces';
import { FormErrorComponent } from '@shared/ui/form-error/form-error';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import {
  StudyPlanIntegrationDetailComponent,
  StudyPlanIntegrationDetailItem,
} from '../study-plan-integration-detail/study-plan-integration-detail.component';
import { SkTextCaseDirective } from 'app/shared/directives/sk-text-mode-case';

interface StageIntegrationItem extends Omit<ISubjectIntegration, 'items'> {
  items_count: number;
}

interface StageIntegrationStorePayload {
  code: string;
  name: string;
  active: boolean;
  order: number;
}

interface StageIntegrationsStage {
  id: number;
  study_plan_id: number;
  name: string;
  start_date?: string | null;
  end_date?: string | null;
  order: number;
  integrations?: StageIntegrationItem[];
}

interface StageIntegrationsIndexData {
  stage?: StageIntegrationsStage | null;
  options?: ScreenOptionItem[];
  children?: ScreenChildItem[];
}

interface StageIntegrationMutationData {
  integration?: StageIntegrationItem | null;
}

@Component({
  selector: 'app-stage-integrations',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    FormErrorComponent,
    UiIconComponent,
    UiButtonComponent,
    StudyPlanIntegrationDetailComponent,
    SkTextCaseDirective,
  ],
  templateUrl: './stage-integrations.component.html',
  styleUrl: './stage-integrations.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StageIntegrationsComponent extends SkolansBaseComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  readonly stageId = input<number | null>(null);
  readonly route = input<string | null>(null);

  readonly back = output<void>();

  protected readonly stage = signal<StageIntegrationsStage | null>(null);
  protected readonly integrations = signal<StageIntegrationItem[]>([]);
  protected readonly selectedIntegration = signal<StageIntegrationItem | null>(null);
  protected readonly selectionBeforeAdding = signal<StageIntegrationItem | null>(null);
  protected readonly addingIntegration = signal(false);
  protected readonly savingIntegration = signal(false);

  protected readonly childControllers = signal<ScreenChildItem[]>([]);

  protected readonly integrationForm = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(20)]],
    name: ['', [Validators.required, Validators.maxLength(100)]],
    active: [true, [Validators.required]],
  });

  protected readonly integrationItemsChild = computed(() => {
    return (
      this.childControllers().find((child) => child.name === 'study-plan-integration-items') ?? null
    );
  });

  protected readonly canOpenIntegrationDetails = computed(() =>
    Boolean(this.integrationItemsChild()),
  );

  constructor() {
    super();

    effect(() => {
      this.setStageIntegrationsAssistantContext();
    });
  }

  ngOnInit(): void {
    this.initRouteMeta();
    this.loadIntegrations();
  }

  protected loadIntegrations(): void {
    const route = this.route();
    const stageId = this.stageId();

    if (!route || !stageId) {
      this.stage.set(null);
      this.integrations.set([]);
      this.selectedIntegration.set(null);
      this.selectionBeforeAdding.set(null);
      this.addingIntegration.set(false);
      this.childControllers.set([]);
      this.clearScreenOptions();
      return;
    }

    this.executeSilentRequest<StageIntegrationsIndexData>(
      this.api.get(`${route}/${stageId}`),
      (res) => {
        const stage = res.data.stage ?? null;

        this.stage.set(stage);
        this.integrations.set(stage?.integrations ?? []);
        this.selectedIntegration.set(null);
        this.selectionBeforeAdding.set(null);
        this.addingIntegration.set(false);
        this.childControllers.set(res.data.children ?? []);
        this.setScreenOptions(res.data.options);
      },
      () => {
        this.stage.set(null);
        this.integrations.set([]);
        this.selectedIntegration.set(null);
        this.selectionBeforeAdding.set(null);
        this.addingIntegration.set(false);
        this.childControllers.set([]);
        this.clearScreenOptions();
      },
    );
  }

  private setStageIntegrationsAssistantContext(): void {
    this.setAssistantContext({
      contextId: 'planning.study-plans.integrations',
      contextType: 'section',
      feature: 'study-plan-integrations',
      entity: 'study-plan-stage-integration',
      mode: 'stage-integrations',
      title: 'planning.study-plan-integrations.title',
      subtitle: 'planning.study-plan-integrations.description',
      data: {
        stageId: this.stageId(),
        hasStage: Boolean(this.stageId()),
        hasControllerRoute: Boolean(this.route()),
        hasItemsRoute: this.canOpenIntegrationDetails(),
        childControllersCount: this.childControllers().length,
        stageName: this.stage()?.name ?? null,
        integrationsCount: this.integrations().length,
        activeIntegrationsCount: this.integrations().filter((integration) => integration.active)
          .length,
        inactiveIntegrationsCount: this.integrations().filter((integration) => !integration.active)
          .length,
        emptyIntegrationsCount: this.integrations().filter(
          (integration) => integration.items_count === 0,
        ).length,
        selectedIntegrationId: this.selectedIntegration()?.id ?? null,
        selectedIntegrationCode: this.selectedIntegration()?.code ?? null,
        selectedIntegrationName: this.selectedIntegration()?.name ?? null,
        integrationItemsRoute: this.itemsRoute(),
        addingIntegration: this.addingIntegration(),
      },
    });
  }

  protected selectIntegration(integration: StageIntegrationItem): void {
    if (!this.canOpenIntegrationDetails() || this.addingIntegration()) {
      return;
    }

    this.selectedIntegration.set(integration);
  }

  protected startAddingIntegration(): void {
    if (!this.getScreenOption('add')) {
      return;
    }

    this.selectionBeforeAdding.set(this.selectedIntegration());
    this.selectedIntegration.set(null);
    this.integrationForm.reset({
      code: '',
      name: '',
      active: true,
    });
    this.addingIntegration.set(true);
  }

  protected cancelAddingIntegration(): void {
    this.addingIntegration.set(false);
    this.savingIntegration.set(false);
    this.integrationForm.reset({
      code: '',
      name: '',
      active: true,
    });
    this.selectedIntegration.set(this.selectionBeforeAdding());
    this.selectionBeforeAdding.set(null);
  }

  protected saveIntegration(): void {
    const route = this.route();
    const stageId = this.stageId();

    if (!route || !stageId || !this.getScreenOption('add')) {
      return;
    }

    this.integrationForm.markAllAsTouched();
    this.integrationForm.updateValueAndValidity();

    if (this.integrationForm.invalid) {
      return;
    }

    const rawPayload = this.integrationForm.getRawValue();
    const payload: StageIntegrationStorePayload = {
      code: rawPayload.code?.trim() ?? '',
      name: rawPayload.name?.trim() ?? '',
      active: rawPayload.active ?? true,
      order: this.integrations().length,
    };

    this.savingIntegration.set(true);
    this.request(
      this.api.post<StageIntegrationMutationData>(`${route}/${stageId}`, payload),
    ).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          this.savingIntegration.set(false);
          return;
        }

        this.handleApiSuccess(res);
        this.savingIntegration.set(false);

        const createdIntegration = res.data.integration ?? null;

        if (!createdIntegration) {
          this.loadIntegrations();
          return;
        }

        this.integrations.update((integrations) =>
          [...integrations, createdIntegration].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
        );
        this.selectedIntegration.set(createdIntegration);
        this.selectionBeforeAdding.set(null);
        this.addingIntegration.set(false);
        this.integrationForm.reset({
          code: '',
          name: '',
          active: true,
        });
      },
      error: () => {
        this.savingIntegration.set(false);
        this.ignoreHandledRequestError();
      },
    });
  }

  protected onIntegrationUpdated(updatedIntegration: StudyPlanIntegrationDetailItem): void {
    const updatedStageIntegration: StageIntegrationItem = {
      ...updatedIntegration,
      items_count: updatedIntegration.items_count ?? this.selectedIntegration()?.items_count ?? 0,
    };

    this.integrations.update((integrations) =>
      integrations.map((integration) =>
        integration.id === updatedStageIntegration.id ? updatedStageIntegration : integration,
      ),
    );

    this.selectedIntegration.set(updatedStageIntegration);
  }

  protected onIntegrationDeleted(integrationId: number): void {
    this.integrations.update((integrations) =>
      integrations
        .filter((integration) => integration.id !== integrationId)
        .map((integration, index) => ({
          ...integration,
          order: index,
        })),
    );

    if (this.selectedIntegration()?.id === integrationId) {
      this.selectedIntegration.set(null);
    }

    if (this.selectionBeforeAdding()?.id === integrationId) {
      this.selectionBeforeAdding.set(null);
    }

    this.addingIntegration.set(false);
  }

  protected itemsRoute(): string | null {
    const route = this.route();
    const child = this.integrationItemsChild();

    if (!route || !child) {
      return null;
    }

    const segments = route.split('/');

    segments.pop(); // elimina el último segmento
    segments.push(child.name); // agrega el controller hijo

    return segments.join('/');
  }

  protected onBack(): void {
    this.back.emit();
  }
}
