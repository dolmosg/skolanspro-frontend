import { Component, OnInit, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import type { ScreenChildItem, ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import type { IStudyPlan } from '@shared/interfaces/study-plan-interfaces';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';

interface StudyPlanCommentsSummary {
  types_count: number;
  comments_count: number;
  assigned_comments_count: number;
  unassigned_comments_count: number;
}
interface StudyPlanCommentsPayload {
  options: ScreenOptionItem[];
  children: ScreenChildItem[];
  summary: StudyPlanCommentsSummary;
}

@Component({
  selector: 'app-study-plan-comments-summary',
  imports: [TranslatePipe, UiIconComponent],
  templateUrl: './study-plan-comments-summary.component.html',
  styleUrl: './study-plan-comments-summary.component.scss',
})
export class StudyPlanCommentsSummaryComponent extends SkolansBaseComponent implements OnInit {
  readonly studyPlan = input.required<IStudyPlan>();
  readonly openView = output<ScreenChildItem>();
  protected readonly summary = signal<StudyPlanCommentsSummary | null>(null);

  ngOnInit(): void {
    this.loadSummary();
  }

  private loadSummary(): void {
    this.executeSilentRequest<StudyPlanCommentsPayload>(
      this.api.get(`planning/study-plan-comments/${this.studyPlan().id}`),
      (response) => {
        this.summary.set(response.data.summary);
        this.setScreenOptions(response.data.options);
        this.setScreenChildren(response.data.children);
      },
    );
  }

  protected commentTypesTranslationKey(count: number): string {
    return count === 1
      ? 'planning.study-plan-comments.summary.comment-type-singular'
      : 'planning.study-plan-comments.summary.comment-types';
  }
  protected assignedCommentsTranslationKey(count: number): string {
    return count === 1
      ? 'planning.study-plan-comments.summary.assigned-comment-singular'
      : 'planning.study-plan-comments.summary.assigned-comments';
  }
  protected unassignedCommentsTranslationKey(count: number): string {
    return count === 1
      ? 'planning.study-plan-comments.summary.unassigned-comment-singular'
      : 'planning.study-plan-comments.summary.unassigned-comments';
  }

  protected openCommentsView(): void {
    const commentTypesController = this.getScreenChild('study-plan-comment-types');

    if (commentTypesController) {
      this.openView.emit(commentTypesController);
    }
  }
}
