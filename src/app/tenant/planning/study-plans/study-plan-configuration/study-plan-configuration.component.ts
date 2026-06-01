import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { ScreenChildItem, ScreenOptionItem } from '@shared/interfaces/configuration.interfaces';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';
import { StudyPlanInformationComponent } from '../study-plan-information/study-plan-information/study-plan-information.component';
import { StudyPlanAcademicsComponent } from "../study-plan-academics/study-plan-academics.component";

export interface StudyPlanConfigurationItem {
  id: number;
  name: string;
  description: string | null;
  start: string;
  end: string;
  level_id: number;
  school_year_id: number;
  section_id: number;
  studyplan_structure_id: number;
  schedule_type_id: number;
  level?: {
    id: number;
    name: string;
    description: string | null;
  } | null;
  school_year?: {
    id: number;
    name: string;
  } | null;
  section?: {
    id: number;
    name: string;
    description: string | null;
    capital?: string | null;
  } | null;
}

export interface StudyPlanConfigurationData {
  'study-plan'?: StudyPlanConfigurationItem;
  children?: ScreenChildItem[];
  options?: ScreenOptionItem[];
}

@Component({
  selector: 'app-study-plan-configuration',
  imports: [
    UiButtonComponent,
    UiIconComponent,
    TranslatePipe,
    DatePipe,
    StudyPlanInformationComponent,
    StudyPlanAcademicsComponent
],
  templateUrl: './study-plan-configuration.component.html',
  styleUrl: './study-plan-configuration.component.scss',
})
export class StudyPlanConfigurationComponent extends SkolansBaseComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly studyPlan = signal<StudyPlanConfigurationItem | null>(null);
  protected readonly activeSection = signal<string>('study-plan-information');

  protected readonly planId = computed(() => {
    const value = this.activatedRoute.snapshot.paramMap.get('planId');

    return value ? Number(value) : null;
  });

  ngOnInit(): void {
    this.initRouteMeta();
    this.loadStudyPlan();
    this.watchActiveSection();
  }

  private loadStudyPlan(): void {
    const route = this.apiRoute();
    const planId = this.planId();

    if (!route || !planId) {
      return;
    }

    this.executeSilentRequest<StudyPlanConfigurationData>(
      this.api.get(`${route}/${planId}`),
      (res) => {
        this.studyPlan.set(res.data?.['study-plan'] ?? null);

        if (res.data?.children) {
          this.setScreenChildren(res.data.children);
        }

        if (res.data?.options) {
          this.setScreenOptions(res.data.options);
        }
      },
    );
  }

  private watchActiveSection(): void {
    this.activatedRoute.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        this.activeSection.set(params.get('section') || 'study-plan-information');
      });
  }

  protected goBack(): void {
    this.router.navigate(['../'], {
      relativeTo: this.activatedRoute,
    });
  }

  protected changeSection(section: string): void {
    if (!section || this.activeSection() === section) {
      return;
    }

    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { section },
      queryParamsHandling: 'merge',
    });
  }

  protected getStudyPlanChildDescription(name: string): string {
    const map: Record<string, string> = {
      'study-plan-information': 'planning.study-plans.children.information',
      'study-plan-academics': 'planning.study-plans.children.academics',
      'study-plan-scheduling': 'planning.study-plans.children.scheduling',
      'study-plan-evaluation': 'planning.study-plans.children.evaluation',
      'study-plan-report-cards': 'planning.study-plans.children.report-cards',
    };

    return map[name] ?? '';
  }

  protected childRoute(name: string): string | null {
    const baseRoute = this.apiRoute();
    const studyPlanId = this.studyPlan()?.id;

    if (!baseRoute || !studyPlanId) {
      return null;
    }

    const segments = baseRoute.split('/');

    segments.pop();
    segments.push(name);
    segments.push(String(studyPlanId));

    return segments.join('/');
  }
}
