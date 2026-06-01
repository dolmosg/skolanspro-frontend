import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { SkSelectComponent } from '../../../../shared/ui/sk-select/sk-select.component';

/**
 * Final step of the tenant creation wizard (operation settings).
 *
 * Responsible for configuring operational behavior of the tenant:
 * - support type
 * - password generation strategy
 * - tenant operational status
 *
 * All selections are driven by catalogs provided by the parent modal.
 */
@Component({
  selector: 'app-operation-step',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, SkSelectComponent],
  templateUrl: './operation-step.component.html',
  styleUrls: ['./operation-step.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationStepComponent {
  /** FormGroup containing operation-related settings. */
  public readonly form = input.required<FormGroup>();
  /** Support type catalog. */
  public readonly supportTypes = input<any[]>([]);
  /** Password strategy catalog. */
  public readonly passwordTypes = input<any[]>([]);

  /** Tenant status catalog. */
  public readonly tenantStatuses = input<any[]>([]);

  /** Shortcut to access form controls in the template. */
  protected readonly controls = computed(() => this.form().controls);
}
