import { Component, OnInit, computed, effect, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import type { IStudyPlan } from '@shared/interfaces/study-plan-interfaces';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';

import { StudyPlanAspectConfigurationComponent } from '../study-plan-aspect-configuration/study-plan-aspect-configuration.component';
import { StudyPlanAspectsCatalogComponent } from '../study-plan-aspects-catalog/study-plan-aspects-catalog.component';
import type { StudyPlanAspectSelection } from '../study-plan-aspects-summary/study-plan-aspects-summary.component';
import type { StudyPlanAspectChildrenResponse } from './study-plan-aspects-view.interfaces';

@Component({
  selector: 'app-study-plan-aspects-view',
  imports: [
    TranslatePipe,
    UiButtonComponent,
    UiIconComponent,
    StudyPlanAspectConfigurationComponent,
    StudyPlanAspectsCatalogComponent,
  ],
  templateUrl: './study-plan-aspects-view.component.html',
  styleUrl: './study-plan-aspects-view.component.scss',
})
export class StudyPlanAspectsViewComponent extends SkolansBaseComponent implements OnInit {
  readonly route = input.required<string>();
  readonly studyPlan = input.required<IStudyPlan>();
  readonly stageId = input<number | null>(null);
  readonly gradeId = input<number | null>(null);
  readonly hasAllowedChildren = input(false);
  readonly close = output<void>();

  private lastChildrenRequestKey: string | null = null;

  protected readonly selectedContext = signal<StudyPlanAspectSelection | null>(null);
  protected readonly stages = computed(() => this.studyPlan().stages ?? []);
  protected readonly grades = computed(() => this.studyPlan().level?.grades ?? []);
  protected readonly configurationRoute = computed(() =>
    this.getScreenChildRoute('study-plan-aspect-configuration'),
  );
  protected readonly configurationOptions = computed(
    () => this.getScreenChild('study-plan-aspect-configuration')?.options ?? [],
  );

  constructor() {
    super();

    effect(() => {
      const route = this.route();
      const studyPlanId = this.studyPlan().id;

      if (!route || !studyPlanId) {
        this.lastChildrenRequestKey = null;
        this.apiRoute.set(null);
        this.clearScreenChildren();
        this.clearScreenOptions();
        return;
      }

      const requestKey = `${route}:${studyPlanId}`;

      if (requestKey === this.lastChildrenRequestKey) {
        return;
      }

      this.lastChildrenRequestKey = requestKey;
      this.apiRoute.set(route);
      this.clearScreenChildren();
      this.clearScreenOptions();
      this.loadChildren(route, studyPlanId, requestKey);
    });
  }

  ngOnInit(): void {
    this.selectedContext.set(this.resolveInitialSelection());
  }

  protected selectCatalog(): void {
    this.selectedContext.set(null);
  }

  protected closeView(): void {
    this.close.emit();
  }

  protected selectConfiguration(stageId: number, gradeId: number | null): void {
    this.selectedContext.set({ stageId, gradeId });
  }

  protected isConfigurationSelected(stageId: number, gradeId: number | null): boolean {
    const selection = this.selectedContext();

    return selection?.stageId === stageId && selection.gradeId === gradeId;
  }

  private resolveInitialSelection(): StudyPlanAspectSelection | null {
    if (!this.hasAllowedChildren()) {
      return null;
    }

    const stageId = this.stageId();

    if (stageId === null) {
      return null;
    }

    const stage = this.stages().find((item) => item.id === stageId);

    if (!stage) {
      return null;
    }

    const gradeId = this.gradeId();

    if (gradeId === null) {
      return stage.has_crossovers ? { stageId, gradeId: null } : null;
    }

    return this.grades().some((grade) => grade.id === gradeId) ? { stageId, gradeId } : null;
  }

  private loadChildren(route: string, studyPlanId: number, requestKey: string): void {
    this.executeSilentRequest<StudyPlanAspectChildrenResponse>(
      this.api.get(`${route}/${studyPlanId}/children`),
      (response) => {
        if (requestKey !== this.lastChildrenRequestKey) {
          return;
        }

        this.setScreenChildren(response.data.children);
        this.clearScreenOptions();
      },
      () => {
        if (requestKey !== this.lastChildrenRequestKey) {
          return;
        }

        this.clearScreenChildren();
        this.clearScreenOptions();
      },
    );
  }
}
