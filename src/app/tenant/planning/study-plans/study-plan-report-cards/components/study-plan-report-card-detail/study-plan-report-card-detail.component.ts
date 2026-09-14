import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import type { ScreenChildItem } from '@shared/interfaces/access.interfaces';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';

import { GradebookSettingsComponent } from '../gradebook-settings/gradebook-settings.component';
import { GradebookDesignComponent } from '../gradebook-design/gradebook-design.component';
import { GradebookSubjectsComponent } from '../gradebook-subjects/gradebook-subjects.component';
import { GradebookAspectsComponent } from '../gradebook-aspects/gradebook-aspects.component';
import { GradebookRubricsComponent } from '../gradebook-rubrics/gradebook-rubrics.component';
import { GradebookSectionsComponent } from '../gradebook-sections/gradebook-sections.component';
import type { StudyPlanReportCardItemDto } from '../../study-plan-report-cards.interfaces';

const CONTENT_TYPE_BY_CHILD: Readonly<Record<string, string>> = {
  'study-plan-report-card-subjects': 'subjects',
  'study-plan-report-card-aspects': 'aspects',
  'study-plan-report-card-rubrics': 'rubrics',
  'study-plan-report-card-sections': 'sections',
};

const SETTINGS_CHILD_NAME = 'study-plan-report-card-settings';
const DESIGN_CHILD_NAME = 'study-plan-report-card-design';
const SUBJECTS_CHILD_NAME = 'study-plan-report-card-subjects';
const ASPECTS_CHILD_NAME = 'study-plan-report-card-aspects';
const RUBRICS_CHILD_NAME = 'study-plan-report-card-rubrics';
const SECTIONS_CHILD_NAME = 'study-plan-report-card-sections';

@Component({
  selector: 'app-study-plan-report-card-detail',
  imports: [TranslatePipe, UiButtonComponent, UiIconComponent, GradebookSettingsComponent, GradebookDesignComponent, GradebookSubjectsComponent, GradebookAspectsComponent, GradebookRubricsComponent, GradebookSectionsComponent],
  templateUrl: './study-plan-report-card-detail.component.html',
  styleUrl: './study-plan-report-card-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudyPlanReportCardDetailComponent {
  readonly gradebook = input.required<StudyPlanReportCardItemDto>();
  readonly studyPlanId = input.required<number | null>();
  readonly children = input.required<ScreenChildItem[]>();
  readonly back = output<void>();

  protected readonly selectedChild = signal<ScreenChildItem | null>(null);

  protected readonly effectiveChildren = computed(() => {
    const contentTypes = new Set(
      this.gradebook()
        .gradebook_type?.content_types.map((contentType) => contentType.name) ?? [],
    );

    return this.children().filter((child) => {
      const requiredContentType = CONTENT_TYPE_BY_CHILD[child.name];

      return !requiredContentType || contentTypes.has(requiredContentType);
    });
  });

  protected readonly selectedSettings = computed(() => {
    const child = this.selectedChild();

    return child?.name === SETTINGS_CHILD_NAME ? child : null;
  });

  protected readonly selectedDesign = computed(() => {
    const child = this.selectedChild();
    return child?.name === DESIGN_CHILD_NAME ? child : null;
  });

  protected readonly selectedSubjects = computed(() => {
    const child = this.selectedChild();
    return child?.name === SUBJECTS_CHILD_NAME ? child : null;
  });
  protected readonly selectedAspects = computed(() => {
    const child = this.selectedChild();
    return child?.name === ASPECTS_CHILD_NAME ? child : null;
  });
  protected readonly selectedRubrics = computed(() => this.selectedChild()?.name === RUBRICS_CHILD_NAME ? this.selectedChild() : null);
  protected readonly selectedSections = computed(() => this.selectedChild()?.name === SECTIONS_CHILD_NAME ? this.selectedChild() : null);

  protected isSettingsChild(child: ScreenChildItem): boolean {
    return child.name === SETTINGS_CHILD_NAME || child.name === DESIGN_CHILD_NAME;
  }

  protected isSubjectsChild(child: ScreenChildItem): boolean {
    return child.name === SUBJECTS_CHILD_NAME || child.name === ASPECTS_CHILD_NAME || child.name === RUBRICS_CHILD_NAME || child.name === SECTIONS_CHILD_NAME;
  }

  protected selectChild(child: ScreenChildItem): void {
    if (this.isSettingsChild(child) || this.isSubjectsChild(child)) {
      this.selectedChild.set(child);
    }
  }

  protected closeSelectedChild(): void {
    this.selectedChild.set(null);
  }
}
