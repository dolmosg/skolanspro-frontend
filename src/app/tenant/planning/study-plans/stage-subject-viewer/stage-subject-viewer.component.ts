import { Component, input, output } from '@angular/core';
import { IStudyPlanStageSubject } from '../study-plan-subjects.interfaces';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { UiMetaItemComponent } from '@shared/ui/ui-meta-item/ui-meta-item.component';
import { ScreenOptionItem } from '@shared/interfaces/access.interfaces';

@Component({
  selector: 'app-stage-subject-viewer',
  imports: [CommonModule, TranslatePipe, UiButtonComponent, UiMetaItemComponent],
  templateUrl: './stage-subject-viewer.component.html',
  styleUrl: './stage-subject-viewer.component.scss',
})
export class StageSubjectViewerComponent {
  readonly subject = input.required<IStudyPlanStageSubject>();

  readonly updateOption = input<ScreenOptionItem | null>(null);
  readonly manageCoordinatorsOption = input<ScreenOptionItem | null>(null);
  readonly deleteOption = input<ScreenOptionItem | null>(null);

  readonly selected = input(false);
  readonly disabled = input(false);

  readonly subjectTypeLabel = input('');
  readonly evaluationTypeLabel = input('');
  readonly gradePolicyLabel = input('');

  readonly coordinatorsLabel = input('');
  readonly settingsLabel = input('');

  readonly edit = output<void>();
  readonly manageCoordinators = output<void>();
  readonly delete = output<void>();
  readonly toggleSelection = output<void>();

  readonly subjectTypeHelp = input('');
  readonly evaluationTypeHelp = input('');
  readonly gradePolicyHelp = input('');

  protected hasCoordinators(): boolean {
    return (this.subject().coordinators ?? []).length > 0;
  }
}
