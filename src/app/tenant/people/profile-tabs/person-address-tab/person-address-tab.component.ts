import { CommonModule } from '@angular/common';
import { Component, OnChanges, SimpleChanges, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '../../../../shared/base/skolans-base-component';
import { UiButtonComponent } from '../../../../shared/ui/ui-button/ui-button';
import { SklConfirmModal } from '../../../../shared/base/skl-confirm-modal/skl-confirm-modal';

import {
  IPersonAddress,
  IPersonCommunicationCatalogItem,
  IPersonCountry,
  IPersonAddressModalData,
  IPersonAddressModalResult,
} from '../person-communication.interfaces';
import { PersonAddressModalComponent } from '../person-address-modal/person-address-modal.component';

interface PersonAddressesOptionsResponse {
  options?: any[];
}

@Component({
  selector: 'app-person-address-tab',
  standalone: true,
  imports: [CommonModule, TranslatePipe, UiButtonComponent],
  templateUrl: './person-address-tab.component.html',
  styleUrl: './person-address-tab.component.scss',
})
export class PersonAddressTabComponent extends SkolansBaseComponent implements OnChanges {
  person = input<any | null>(null);
  route = input<string | null>(null);

  addressTypes = input<IPersonCommunicationCatalogItem[]>([]);
  countries = input<IPersonCountry[]>([]);
  defaultCountryId = input<number | null>(null);
  personUpdated = output<Partial<any>>();

  protected readonly addresses = signal<IPersonAddress[]>([]);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['person']) {
      this.syncPersonAddresses();
    }

    if (changes['route']) {
      this.loadOptions();
    }
  }

  private syncPersonAddresses(): void {
    this.addresses.set(this.person()?.addresses ?? []);
  }

  private loadOptions(): void {
    const route = this.route();

    if (!route) {
      this.options.set([]);
      return;
    }

    this.executeSilentRequest(
      this.api.get<PersonAddressesOptionsResponse>(route),
      (res) => {
        this.options.set(res.data?.options ?? []);
      },
      () => {
        this.options.set([]);
      },
    );
  }

  protected getAddressType(address: IPersonAddress): string {
    const type = address.address_type ?? address.addressType;

    return type?.translation || type?.description || type?.name || 'Sin tipo';
  }

  protected getCountry(address: IPersonAddress): string {
    return address.country?.name ?? '';
  }

  protected getAddressLine(address: IPersonAddress): string {
    const parts = [
      address.street,
      address.outdoor ? `#${address.outdoor}` : null,
      address.indoor ? `Int. ${address.indoor}` : null,
    ];

    return parts.filter(Boolean).join(' ');
  }

  protected getLocationLine(address: IPersonAddress): string {
    const parts = [
      address.colony,
      address.municipality,
      address.city,
      address.state,
      address.zip_code ? `C.P. ${address.zip_code}` : null,
    ];

    return parts.filter(Boolean).join(', ');
  }

  protected async onAdd(): Promise<void> {
    const route = this.route();
    const personId = this.person()?.id;

    if (!route || !personId) {
      return;
    }

    const result = await this.modal.open<IPersonAddressModalData, IPersonAddressModalResult>({
      component: PersonAddressModalComponent,
      data: {
        personId,
        address: null,
        addressTypes: this.addressTypes(),
        countries: this.countries(),
        defaultCountryId: this.defaultCountryId(),
      },
      title: this.translate.instant('administration.person-addresses.add'),
      description: this.translate.instant(
        'administration.person-addresses.messages.update-description',
      ),
      size: 'lg',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) {
      return;
    }

    this.executeMutationRequest(
      this.api.post<{ address: IPersonAddress }>(route, result.payload),
      (res) => {
        const insertedAddress = res.data?.address;

        if (!insertedAddress) {
          return;
        }

        this.addresses.update((current) => {
          const addresses = [...current, insertedAddress];

          this.personUpdated.emit({ addresses });

          return addresses;
        });
      },
    );
  }

  protected async onEdit(address: IPersonAddress): Promise<void> {
    const route = this.route();
    const personId = this.person()?.id;

    if (!route || !personId || !address.id) {
      return;
    }

    const result = await this.modal.open<IPersonAddressModalData, IPersonAddressModalResult>({
      component: PersonAddressModalComponent,
      data: {
        personId,
        address,
        addressTypes: this.addressTypes(),
        countries: this.countries(),
        defaultCountryId: this.defaultCountryId(),
      },
      title: this.translate.instant('administration.person-addresses.update'),
      description: this.translate.instant(
        'administration.person-addresses.messages.update-description',
      ),
      size: 'lg',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) {
      return;
    }

    this.executeMutationRequest(
      this.api.put<{ address: IPersonAddress }>(`${route}/${address.id}`, result.payload),
      (res) => {
        const updatedAddress = res.data?.address;

        if (!updatedAddress) {
          return;
        }

        this.addresses.update((current) => {
          const addresses = current.map((item) =>
            item.id === updatedAddress.id ? updatedAddress : item,
          );

          this.personUpdated.emit({ addresses });

          return addresses;
        });
      },
    );
  }

  protected async onDelete(address: IPersonAddress): Promise<void> {
    const route = this.route();

    if (!route || !address.id) {
      return;
    }

    const confirmed = await this.modal.open<
      {
        message: string;
        confirmLabel: string;
        cancelLabel: string;
        type: 'danger';
      },
      boolean
    >({
      component: SklConfirmModal,
      title: this.translate.instant('administration.person-addresses.delete'),
      data: {
        message: this.translate.instant('administration.person-addresses.messages.confirm-delete'),
        confirmLabel: this.translate.instant('common.delete'),
        cancelLabel: this.translate.instant('common.cancel'),
        type: 'danger',
      },
      size: 'sm',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!confirmed) {
      return;
    }

    this.request(this.api.delete<unknown>(`${route}/${address.id}`)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        this.handleApiSuccess(res);

        this.addresses.update((current) => {
          const addresses = current.filter((item) => item.id !== address.id);

          this.personUpdated.emit({ addresses });

          return addresses;
        });
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }
}
