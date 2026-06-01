import { Component, computed, effect, inject, input, signal, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UiButtonComponent } from '../../../shared/ui/ui-button/ui-button';
import { OperationStepComponent } from '../steps/operation-step/operation-step.component';
import { OrganizationStepComponent } from '../steps/organization-step/organization-step.component';
import { SiteStepComponent } from '../steps/site-step/site-step.component';
import { TenantStepComponent } from '../steps/tenant-step/tenant-step.component';
import { SklModalService } from '../../../shared/services/skl-modal-service';

/**
 * Modal wizard used to create a new tenant in the central administration area.
 *
 * The form is intentionally structured to match the backend payload:
 * - tenant
 * - domain
 * - organization
 * - settings
 *
 * Each wizard step receives only the FormGroup and catalogs it needs, keeping
 * the step components focused on presentation and local validation feedback.
 *
 * Expected shape includes catalogs such as countries, themes, supportTypes,
 * passwordTypes, languages, captions and tenantStatuses.
 */
@Component({
  selector: 'app-tenant-modal',
  standalone: true,
  imports: [
    TenantStepComponent,
    OrganizationStepComponent,
    SiteStepComponent,
    OperationStepComponent,
    UiButtonComponent,
  ],
  templateUrl: './tenant-modal.component.html',
  styleUrls: ['./tenant-modal.component.scss'],
  encapsulation: ViewEncapsulation.None,
})

export class TenantModalComponent {

  private readonly fb = new FormBuilder();
  private readonly modal = inject(SklModalService);

  /**
   * Data injected by the modal service when the component is opened.
   *
   * Expected shape includes catalogs such as countries, themes, supportTypes,
   * passwordTypes, languages, captions and tenantStatuses.
   */
  public readonly data = input<any>(null);

  /** Catalogs used by the wizard steps. */
  protected readonly countries = signal<any[]>([]);
  protected readonly themes = signal<any[]>([]);
  protected readonly supportTypes = signal<any[]>([]);
  protected readonly passwordTypes = signal<any[]>([]);
  protected readonly languages = signal<any[]>([]);
  protected readonly captions = signal<any[]>([]);
  protected readonly tenantStatuses = signal<any[]>([]);

  /**
   * Reads modal input data reactively and normalizes it into local signals.
   *
   * This keeps the template simple and avoids passing raw modal data directly
   * to child components.
   */
  constructor() {
    effect(() => {
      const modalData = this.data();

      if (modalData) {
        this.onModalDataReceived(modalData);
      }
    });
  }
  
  /**
   * Normalizes catalog data received from the tenants index payload.
   */
  protected onModalDataReceived(data: any): void {
    this.countries.set(data?.countries ?? []);
    this.themes.set(data?.themes ?? []);
    this.supportTypes.set(data?.supportTypes ?? []);
    this.passwordTypes.set(data?.passwordTypes ?? []);
    this.languages.set(data?.languages ?? []);
    this.captions.set(data?.captions ?? []);
    this.tenantStatuses.set(data?.tenantStatuses ?? []);

    if (data?.tenant) {
      this.patchTenant(data.tenant);
    }
  }

  /**
   * Hydrates the wizard form when editing an existing tenant.
   */
  protected patchTenant(tenant: any): void {
    this.form.patchValue({
      tenant: {
        id: tenant?.id ?? '',
      },
      domain: {
        domain: tenant?.domains?.[0]?.domain ?? '',
      },
      organization: {
        business: tenant?.organization?.business ?? '',
        tin: tenant?.organization?.tin ?? '',
        trade: tenant?.organization?.trade ?? '',
        street: tenant?.organization?.street ?? '',
        outdoor: tenant?.organization?.outdoor ?? '',
        indoor: tenant?.organization?.indoor ?? '',
        colony: tenant?.organization?.colony ?? '',
        city: tenant?.organization?.city ?? '',
        state: tenant?.organization?.state ?? '',
        municipality: tenant?.organization?.municipality ?? '',
        zipcode: tenant?.organization?.zipcode ?? '',
        country_id: tenant?.organization?.country_id ?? null,
      },
      settings: {
        site_name: tenant?.settings?.site_name ?? '',
        logo: tenant?.settings?.logo ?? null,
        administrator_email: tenant?.settings?.administrator_email ?? '',
        contact_name: tenant?.settings?.contact_name ?? '',
        contact_lastname: tenant?.settings?.contact_lastname ?? '',
        contact_mothername: tenant?.settings?.contact_mothername ?? '',
        mailer_email: tenant?.settings?.mailer_email ?? '',
        mailer_name: tenant?.settings?.mailer_name ?? '',
        google_login: tenant?.settings?.google_login ?? false,
        grades_health_record: tenant?.settings?.grades_health_record ?? false,
        licenses: tenant?.settings?.licenses ?? 0,
        tenant_status_id: tenant?.settings?.tenant_status_id ?? 1,
        maintenance_mode: tenant?.settings?.maintenance_mode ?? false,
        maintenance_until: tenant?.settings?.maintenance_until ?? null,
        organization_theme_id: tenant?.settings?.organization_theme_id ?? null,
        support_type_id: tenant?.settings?.support_type_id ?? null,
        password_type_id: tenant?.settings?.password_type_id ?? null,
        language_id: tenant?.settings?.language_id ?? null,
        name_casing_id: tenant?.settings?.name_casing_id ?? null,
      },
    });
  }

  /** Current step index of the wizard. */
  protected readonly step = signal(0);

  /** Ordered list of wizard step identifiers. */
  protected readonly steps = [
    'tenant',
    'organization',
    'site',
    'operation'
  ];

  /** Computed catalog accessors passed to step components. */
  protected readonly countriesOptions = computed(() => this.countries());
  protected readonly themesOptions = computed(() => this.themes());
  protected readonly supportTypesOptions = computed(() => this.supportTypes());
  protected readonly passwordTypesOptions = computed(() => this.passwordTypes());
  protected readonly languagesOptions = computed(() => this.languages());
  protected readonly captionsOptions = computed(() => this.captions());
  protected readonly tenantStatusesOptions = computed(() => this.tenantStatuses());

  /** Navigation state helpers used by the wizard footer. */
  protected readonly isFirstStep = computed(() => this.step() === 0);
  protected readonly isLastStep = computed(() => this.step() === this.steps.length - 1);

  /**
   * Main reactive form.
   *
   * The nested structure mirrors the API payload expected by the backend.
   */
  protected readonly form = this.fb.group({
    tenant: this.fb.group({
      id: ['', Validators.required],
    }),
    domain: this.fb.group({
      domain: ['', Validators.required],
    }),
    organization: this.fb.group({
      business: ['', Validators.required],
      tin: ['', Validators.required],
      trade: ['', Validators.required],
      street: [''],
      outdoor: [''],
      indoor: [''],
      colony: [''],
      city: [''],
      state: [''],
      municipality: [''],
      zipcode: [''],
      country_id: [null, Validators.required],
    }),
    settings: this.fb.group({
      site_name: ['', Validators.required],
      logo: [null],

      administrator_email: ['', [Validators.required, Validators.email]],
      contact_name: [''],
      contact_lastname: [''],
      contact_mothername: [''],

      mailer_email: ['', [Validators.required, Validators.email]],
      mailer_name: ['', Validators.required],

      google_login: [false],
      grades_health_record: [false],
      licenses: [0, [Validators.required, Validators.min(0)]],
      tenant_status_id: [1, Validators.required],

      maintenance_mode: [false],
      maintenance_until: [null],

      organization_theme_id: [null, Validators.required],
      support_type_id: [null, Validators.required],
      password_type_id: [null, Validators.required],
      language_id: [null, Validators.required],
      name_casing_id: [null, Validators.required],
    }),
  });

  /** FormGroup shortcuts passed to child step components. */
  protected get tenantForm() {
    return this.form.get('tenant') as FormGroup;
  }

  protected get domainForm() {
    return this.form.get('domain') as FormGroup;
  }

  protected get organizationForm() {
    return this.form.get('organization') as FormGroup;
  }

  protected get settingsForm() {
    return this.form.get('settings') as FormGroup;
  }

  /**
   * Validates only the active wizard step before allowing navigation.
   */
  protected isCurrentStepValid(): boolean {
    switch (this.step()) {
      case 0:
        return !!this.form.get('tenant')?.valid && !!this.form.get('domain')?.valid;

      case 1:
        return !!this.form.get('organization')?.valid;

      case 2:
        return !!this.form.get('settings.site_name')?.valid;

      case 3:
        return this.form.valid;

      default:
        return false;
    }
  }

  /** Moves the wizard forward when the current step is valid. */
  protected nextStep(): void {
    if (!this.isCurrentStepValid()) return;

    this.step.update(s => s + 1);
  }

  /** Moves the wizard one step back. */
  protected prevStep(): void {
    this.step.update(s => s - 1);
  }

  /**
   * Builds the tenant creation payload.
   *
   * The API call will be connected here once the modal flow is finalized.
   */
  protected submit(): void {
    if (!this.form.valid) return;

    const payload = this.form.value;

    this.modal.close(payload);
  }
}