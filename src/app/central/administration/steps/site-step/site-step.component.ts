import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SkSelectComponent } from '../../../../shared/ui/sk-select/sk-select.component';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * Third step of the tenant creation wizard (site configuration).
 *
 * Responsible for visual and locale configuration of the tenant:
 * - theme selection
 * - default language
 * - name caption behavior
 *
 * Receives catalogs from the parent modal and binds them to sk-select controls.
 */
@Component({
  selector: 'app-site-step',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, SkSelectComponent],
  templateUrl: './site-step.component.html',
  styleUrls: ['./site-step.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteStepComponent {
  /** FormGroup containing site-related settings. */
  public readonly form = input.required<FormGroup>();
  /** Available theme catalog. */
  public readonly themes = input<any[]>([]);
  /** Available language catalog. */
  public readonly languages = input<any[]>([]);
  /** Name caption options (uppercase, capital, normal). */
  public readonly captions = input<any[]>([]);

  /** Shortcut to access form controls in the template. */
  protected readonly controls = computed(() => this.form().controls);
}
