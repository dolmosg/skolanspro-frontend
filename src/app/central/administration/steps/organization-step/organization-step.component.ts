import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { TranslatePipe } from '@ngx-translate/core';
import { SkSelectComponent } from '../../../../shared/ui/sk-select/sk-select.component';
import { SkUppercaseDirective } from '../../../../shared/directives/uppercase';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '@shared/services/api-service';

interface PostalCodeSettlement {
  id: number;
  postal_code: string;
  settlement: string;
  settlement_type: string | null;
  municipality: string | null;
  state: string | null;
  city: string | null;
}
/**
 * Second step of the tenant creation wizard (organization data).
 *
 * Responsible for capturing the organization’s general information:
 * - organization name
 * - country
 * - contact data
 *
 * Uses shared sk-select for catalog-driven inputs.
 */
@Component({
  selector: 'app-organization-step',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, NgSelectModule, SkSelectComponent, SkUppercaseDirective],
  templateUrl: './organization-step.component.html',
  styleUrls: ['./organization-step.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationStepComponent {
  private readonly api = inject(ApiService);
  /** FormGroup containing organization-related data. */
  public readonly form = input.required<FormGroup>();

  protected readonly postalCodeSettlements = signal<PostalCodeSettlement[]>([]);
  protected readonly hasPostalCodeOptions = computed(() => this.postalCodeSettlements().length > 1);

  /** Shortcut to access form controls in the template. */
  protected readonly controls = computed(() => this.form().controls);

  /** Country catalog used for selection. */
  public readonly countries = input<any[]>([]);

  protected onZipCodeChange(): void {
      const zipCode = String(this.form().controls['zipcode'].value ?? '').trim();
  
      if (!/^[0-9]{5}$/.test(zipCode)) {
        return;
      }
  
      this.searchZipCode(zipCode);
    }
  
    protected async searchZipCode(zip: string): Promise<void> {
      const response = await firstValueFrom(
        this.api.get<{
          postal_code: string;
          settlements: PostalCodeSettlement[];
        }>(`postal-codes/search?postal_code=${encodeURIComponent(zip)}`, {
          loader: false,
        }),
      );
  
      if (!response.success) {
        return;
      }
  
      const settlements = response.data.settlements ?? [];
  
      this.postalCodeSettlements.set(settlements);
  
      if (settlements.length === 1) {
        this.applySettlement(settlements[0]);
      }
    }
  
    protected selectSettlement(settlement: PostalCodeSettlement): void {
      this.applySettlement(settlement);
      this.postalCodeSettlements.set([]);
    }
  
    private applySettlement(settlement: PostalCodeSettlement): void {
      this.form().patchValue({
        colony: settlement.settlement,
        municipality: settlement.municipality!,
        state: settlement.state!,
        city: settlement.city!,
      });
    }
}