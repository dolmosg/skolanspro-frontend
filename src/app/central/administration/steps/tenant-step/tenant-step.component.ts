import { Component, DestroyRef, computed, inject, input } from '@angular/core';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * First step of the tenant creation wizard.
 *
 * Handles the tenant identifier and the public domain that will be registered
 * for the tenant. The tenant id is normalized as the user types and, unless
 * the domain was manually edited, the domain is automatically suggested using
 * the configured base domain.
 */
@Component({
  selector: 'app-tenant-step',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './tenant-step.component.html',
  styleUrls: ['./tenant-step.component.scss'],
})
export class TenantStepComponent {
  /** Used to automatically dispose valueChanges subscriptions. */
  private readonly destroyRef = inject(DestroyRef);

  /**
   * Tracks whether the user manually changed the suggested domain.
   *
   * When true, tenant id changes no longer overwrite the domain field.
   */
  private domainTouchedManually = false;

  /** Tenant FormGroup containing the tenant id. */
  public readonly form = input.required<FormGroup>();

  /** Domain FormGroup containing the domain value. */
  public readonly domainForm = input.required<FormGroup>();

  /** Base domain used to suggest the tenant domain. */
  public readonly baseDomain = input<string>('skolanspro.test');

  /** Computed shortcuts for the controls used by this step. */
  protected readonly tenantIdControl = computed(() => this.form().get('id'));
  protected readonly domainControl = computed(() => this.domainForm().get('domain'));

  /**
   * Defers subscription binding until the required input FormGroups are ready.
   */
  constructor() {
    queueMicrotask(() => {
      this.bindTenantIdAutofill();
      this.bindDomainManualDetection();
    });
  }

  /**
   * Normalizes the tenant id and updates the suggested domain when appropriate.
   */
  private bindTenantIdAutofill(): void {
    const tenantIdControl = this.tenantIdControl();

    if (!tenantIdControl) {
      return;
    }

    tenantIdControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        const normalized = this.normalizeTenantId(value);

        if (value !== normalized) {
          tenantIdControl.setValue(normalized, { emitEvent: false });
        }

        const domainControl = this.domainControl();

        if (!domainControl || this.domainTouchedManually) {
          return;
        }

        const suggestedDomain = normalized
          ? `${normalized}.${this.baseDomain()}`
          : '';

        domainControl.setValue(suggestedDomain, { emitEvent: false });
      });
  }

  /**
   * Detects when the user manually changes the suggested domain.
   */
  private bindDomainManualDetection(): void {
    const domainControl = this.domainControl();

    if (!domainControl) {
      return;
    }

    domainControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        const tenantId = this.normalizeTenantId(this.tenantIdControl()?.value);
        const expectedDomain = tenantId ? `${tenantId}.${this.baseDomain()}` : '';

        this.domainTouchedManually = !!value && value !== expectedDomain;
      });
  }

  /**
   * Restores the domain suggestion based on the current tenant id.
   */
  protected resetDomainSuggestion(): void {
    const tenantId = this.normalizeTenantId(this.tenantIdControl()?.value);
    const domainControl = this.domainControl();

    if (!domainControl) {
      return;
    }

    this.domainTouchedManually = false;
    domainControl.setValue(tenantId ? `${tenantId}.${this.baseDomain()}` : '');
    domainControl.markAsDirty();
    domainControl.markAsTouched();
  }

  /**
   * Converts arbitrary input into a safe tenant identifier.
   */
  private normalizeTenantId(value: unknown): string {
    return String(value ?? '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
