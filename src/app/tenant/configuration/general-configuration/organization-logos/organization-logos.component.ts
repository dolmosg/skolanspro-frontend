import { ChangeDetectionStrategy, Component, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

import { BaseCrud } from '@shared/base/base-crud';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

import {
  OrganizationLogosModalComponent,
  OrganizationLogosModalData,
  OrganizationLogosModalResult,
} from '../organization-logos-modal/organization-logos-modal.component';

import {
  UploadLogoModalComponent,
  UploadLogoModalData,
  UploadLogoModalResult,
} from '../upload-logo-modal/upload-logo-modal.component';

export interface IOrganizationLogo {
  id: number;
  name: string;
  file: string | null;
  logo: string | null;
  default: boolean;
  active: boolean;
}

interface OrganizationLogosIndexData {
  organization_logos: IOrganizationLogo[];
  options?: Parameters<BaseCrud<IOrganizationLogo>['setScreenOptions']>[0];
}

@Component({
  selector: 'app-organization-logos',
  standalone: true,
  imports: [CommonModule, UiButtonComponent, TranslatePipe],
  templateUrl: './organization-logos.component.html',
  styleUrl: './organization-logos.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationLogosComponent extends BaseCrud<IOrganizationLogo> implements OnInit {
  protected readonly organizationLogos = signal<IOrganizationLogo[]>([]);
  protected readonly selectedLogo = signal<IOrganizationLogo | null>(null);

  protected readonly hasLogos = computed(() => this.organizationLogos().length > 0);
  protected readonly hasSelection = computed(() => !!this.selectedLogo());

  ngOnInit(): void {
    this.initRouteMeta();
    this.reloadOrganizationLogos();
  }

  protected reloadOrganizationLogos(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.executeSilentRequest<OrganizationLogosIndexData>(this.api.get(route), (res) => {
      this.organizationLogos.set(res.data.organization_logos ?? []);
      this.setScreenOptions(res.data.options);
      this.selectedLogo.set(null);
    });
  }

  protected selectLogo(logo: IOrganizationLogo): void {
    this.selectedLogo.set(this.selectedLogo()?.id === logo.id ? null : logo);
  }

  protected async onAdd(): Promise<void> {
    const result = await this.modal.open<OrganizationLogosModalData, OrganizationLogosModalResult>({
      component: OrganizationLogosModalComponent,
      data: {
        logo: null,
      },
      title: this.translate.instant('configuration.organization-logos.add'),
      description: this.translate.instant(
        'configuration.organization-logos.messages.create-description',
      ),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved || !result.payload) {
      return;
    }

    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.executeMutationRequest<{ organization_logo: IOrganizationLogo }>(
      this.api.post(route, result.payload),
      (res) => {
        const createdLogo = res.data.organization_logo;

        if (!createdLogo) {
          this.reloadOrganizationLogos();
          return;
        }

        if (createdLogo.default) {
          this.organizationLogos.update((logos) =>
            logos.map((logo) => ({
              ...logo,
              default: false,
            })),
          );
        }

        this.applyCreatedItem(this.organizationLogos, createdLogo);
      },
    );
  }

  protected async onEdit(logo: IOrganizationLogo): Promise<void> {
    const result = await this.modal.open<OrganizationLogosModalData, OrganizationLogosModalResult>({
      component: OrganizationLogosModalComponent,
      data: {
        logo,
      },
      title: this.translate.instant('configuration.organization-logos.update'),
      description: this.translate.instant(
        'configuration.organization-logos.messages.update-description',
      ),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved || !result.payload) {
      return;
    }

    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.executeMutationRequest<{ organization_logo: IOrganizationLogo }>(
      this.api.put(`${route}/${logo.id}`, result.payload),
      (res) => {
        const updatedLogo = res.data.organization_logo;

        if (!updatedLogo) {
          this.reloadOrganizationLogos();
          return;
        }

        if (updatedLogo.default) {
          this.organizationLogos.update((logos) =>
            logos.map((item) => ({
              ...item,
              default: item.id === updatedLogo.id,
            })),
          );
        }

        this.applyUpdatedItem(this.organizationLogos, updatedLogo);
      },
    );
  }

  protected async onDelete(logo: IOrganizationLogo): Promise<void> {
    const confirmed = await this.confirmDelete(
      'configuration.organization-logos.delete',
      'configuration.organization-logos.messages.confirm-delete',
    );

    if (!confirmed) {
      return;
    }

    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.executeMutationRequest<unknown>(this.api.delete(`${route}/${logo.id}`), () => {
      this.applyDeletedItem(this.organizationLogos, logo.id);

      if (this.selectedLogo()?.id === logo.id) {
        this.selectedLogo.set(null);
      }
    });
  }

  protected async onUpload(logo: IOrganizationLogo): Promise<void> {
    const result = await this.modal.open<UploadLogoModalData, UploadLogoModalResult>({
      component: UploadLogoModalComponent,
      data: {
        logo,
      },
      title: this.translate.instant('configuration.organization-logos.upload-modal.title'),
      description: this.translate.instant('configuration.organization-logos.upload-modal.description'),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved || !result.file) {
      return;
    }

    const route = this.apiRoute();

    console.log(route);

    if (!route) {
      return;
    }

    const formData = new FormData();

    formData.append('file', result.file);

    this.executeMutationRequest<{ organization_logo: IOrganizationLogo }>(
      this.api.post(`${route}/upload/${logo.id}`, formData),
      (res) => {
        const updatedLogo = res.data.organization_logo;

        if (!updatedLogo) {
          this.reloadOrganizationLogos();
          return;
        }

        this.applyUpdatedItem(this.organizationLogos, updatedLogo);
      },
    );
  }
}
