import { ChangeDetectionStrategy, Component, OnInit, computed, input, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import type { ScreenChildItem } from '@shared/interfaces/access.interfaces';
import type { IRubric } from '@shared/interfaces/planning.interfaces';
import type { IStudyPlanTerm } from '@shared/interfaces/study-plan-interfaces';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

import type { RubricTermsIndexDto, RubricTermsMutationDto } from '../../rubrics.interfaces';

/**
 * Configures the final set of terms that apply to one rubric.
 *
 * The parent owns the rubric and child-controller metadata. This component owns
 * only the terms returned by its child endpoint and the local selected-ID set;
 * a successful PUT replaces that selection from the backend's canonical pivot.
 */
@Component({
  selector: 'app-rubric-terms',
  imports: [TranslatePipe, UiButtonComponent],
  templateUrl: './rubric-terms.component.html',
  styleUrl: './rubric-terms.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RubricTermsComponent extends SkolansBaseComponent implements OnInit {
  readonly rubric = input.required<IRubric>();
  readonly child = input.required<ScreenChildItem>();

  protected readonly terms = signal<IStudyPlanTerm[]>([]);
  protected readonly selectedTermIds = signal<Set<number>>(new Set());
  protected readonly loaded = signal(false);
  protected readonly canUpdate = computed(() => !!this.getScreenOption('update'));

  ngOnInit(): void {
    this.loadTerms();
  }

  protected isSelected(termId: number): boolean {
    return this.selectedTermIds().has(termId);
  }

  protected toggleTerm(termId: number, event: Event): void {
    if (!this.canUpdate() || this.loading()) {
      return;
    }

    const checked = (event.target as HTMLInputElement).checked;

    this.selectedTermIds.update((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(termId);
      } else {
        next.delete(termId);
      }

      return next;
    });
  }

  protected save(): void {
    const route = this.child().route;

    if (!route || !this.loaded() || !this.canUpdate() || this.loading()) {
      return;
    }

    this.executeMutationRequest<RubricTermsMutationDto>(
      this.api.put(`${route}/${this.rubric().id}`, {
        term_ids: Array.from(this.selectedTermIds()),
      }),
      (response) => this.setSelectedTerms(response.data.study_plan_terms),
    );
  }

  private loadTerms(): void {
    const route = this.child().route;

    if (!route) {
      return;
    }

    this.loaded.set(false);
    this.executeSilentRequest<RubricTermsIndexDto>(
      this.api.get(`${route}/${this.rubric().id}`),
      (response) => {
        this.terms.set(response.data.terms);
        this.setScreenOptions(response.data.options);
        this.setSelectedTerms(response.data.study_plan_terms);
        this.loaded.set(true);
      },
    );
  }

  private setSelectedTerms(studyPlanTerms: IStudyPlanTerm[]): void {
    this.selectedTermIds.set(new Set(studyPlanTerms.map((term) => term.id)));
  }
}
