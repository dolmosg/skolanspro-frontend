import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import type { ScreenChildItem } from '@shared/interfaces/access.interfaces';
import type { IRubric } from '@shared/interfaces/planning.interfaces';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';

import { RubricTermsComponent } from '../rubric-terms/rubric-terms.component';
import { RubricAssignmentsComponent } from '../rubric-assignments/rubric-assignments.component';
import { RubricScalesComponent } from '../rubric-scales/rubric-scales.component';
import { RubricSectionsComponent } from '../rubric-sections/rubric-sections.component';

@Component({
  selector: 'app-rubric-detail',
  imports: [
    TranslatePipe,
    UiButtonComponent,
    UiIconComponent,
    RubricAssignmentsComponent,
    RubricTermsComponent,
    RubricScalesComponent,
    RubricSectionsComponent,
  ],
  templateUrl: './rubric-detail.component.html',
  styleUrl: './rubric-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RubricDetailComponent {
  readonly rubric = input.required<IRubric>();
  readonly children = input.required<ScreenChildItem[]>();
  readonly back = output<void>();

  protected readonly selectedChild = signal<ScreenChildItem | null>(null);

  protected openChild(child: ScreenChildItem): void {
    if (
      (child.name === 'rubric-terms' ||
        child.name === 'rubric-scales' ||
        child.name === 'rubric-sections' ||
        child.name === 'rubric-assignments') &&
      child.route
    ) {
      this.selectedChild.set(child);
    }
  }

}
