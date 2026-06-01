import { CommonModule } from '@angular/common';
import { Component, OnChanges, SimpleChanges, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '../../../../shared/base/skolans-base-component';
import { UiButtonComponent } from '../../../../shared/ui/ui-button/ui-button';
import {
  IPersonCommunicationCatalogItem,
  IPersonCountry,
  IPersonPhone,
  IPersonPhoneModalData,
  IPersonPhoneModalResult,
} from '../person-communication.interfaces';

import { PersonPhoneModalComponent } from '../person-phone-modal/person-phone-modal.component';
import { PhoneFormatPipe } from '../../../../shared/pipes/phone-format-pipe';
import { SklConfirmModal } from '../../../../shared/base/skl-confirm-modal/skl-confirm-modal';

interface PersonPhonesOptionsResponse {
  options?: any[];
}

@Component({
  selector: 'app-person-phones-tab',
  standalone: true,
  imports: [CommonModule, TranslatePipe, UiButtonComponent, PhoneFormatPipe],
  templateUrl: './person-phones-tab.component.html',
  styleUrl: './person-phones-tab.component.scss',
})
export class PersonPhonesTabComponent extends SkolansBaseComponent implements OnChanges {
  person = input<any | null>(null);
  route = input<string | null>(null);

  phoneTypes = input<IPersonCommunicationCatalogItem[]>([]);
  countries = input<IPersonCountry[]>([]);
  defaultCountryId = input<number | null>(null);
  personUpdated = output<Partial<any>>();

  protected readonly phones = signal<IPersonPhone[]>([]);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['person']) {
      this.syncPersonPhones();
    }

    if (changes['route']) {
      this.loadOptions();
    }
  }

  private syncPersonPhones(): void {
    this.phones.set(this.person()?.phones ?? []);
  }

  private loadOptions(): void {
    const route = this.route();

    if (!route) {
      this.options.set([]);
      return;
    }

    this.executeSilentRequest(
      this.api.get<PersonPhonesOptionsResponse>(route),
      (res) => {
        this.options.set(res.data?.options ?? []);
      },
      () => {
        this.options.set([]);
      },
    );
  }

  protected getPhoneType(phone: IPersonPhone): string {
    const type = phone.phone_type ?? phone.phoneType;

    return type?.translation || type?.description || type?.name || 'Sin tipo';
  }

  protected getCountry(phone: IPersonPhone): string {
    return phone.country?.name ?? '';
  }

  protected async onAdd(): Promise<void> {
    const route = this.route();
    const personId = this.person()?.id;

    if (!route || !personId) {
      return;
    }

    const result = await this.modal.open<IPersonPhoneModalData, IPersonPhoneModalResult>({
      component: PersonPhoneModalComponent,
      data: {
        personId,
        phone: null,
        phoneTypes: this.phoneTypes(),
        countries: this.countries(),
        defaultCountryId: this.defaultCountryId(),
      },
      title: this.translate.instant('administration.person-phones.add'),
      description: this.translate.instant(
        'administration.person-phones.messages.update-description',
      ),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) {
      return;
    }

    this.executeMutationRequest(
      this.api.post<{ phone: IPersonPhone }>(route, result.payload),
      (res) => {
        const insertedPhone = res.data?.phone;

        if (!insertedPhone) {
          return;
        }

        this.phones.update((current) => {
          const phones = [...current, insertedPhone];

          this.personUpdated.emit({ phones });

          return phones;
        });
      },
    );
  }

  protected async onEdit(phone: IPersonPhone): Promise<void> {
    const route = this.route();
    const personId = this.person()?.id;

    if (!route || !personId || !phone.id) {
      return;
    }

    const result = await this.modal.open<IPersonPhoneModalData, IPersonPhoneModalResult>({
      component: PersonPhoneModalComponent,
      data: {
        personId,
        phone,
        phoneTypes: this.phoneTypes(),
        countries: this.countries(),
        defaultCountryId: this.defaultCountryId(),
      },
      title: this.translate.instant('administration.person-phones.update'),
      description: this.translate.instant(
        'administration.person-phones.messages.update-description',
      ),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!result?.saved) {
      return;
    }

    this.executeMutationRequest(
      this.api.put<{ phone: IPersonPhone }>(`${route}/${phone.id}`, result.payload),
      (res) => {
        const updatedPhone = res.data?.phone;

        if (!updatedPhone) {
          return;
        }

        this.phones.update((phones) => {
          const updated = phones.map((item) => (item.id === updatedPhone.id ? updatedPhone : item));

          this.personUpdated.emit({ phones: updated });

          return updated;
        });
      },
    );
  }

  protected async onDelete(phone: IPersonPhone): Promise<void> {
  const route = this.route();

  if (!route || !phone.id) {
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
    title: this.translate.instant('administration.person-phones.delete'),
    data: {
      message: this.translate.instant('administration.person-phones.messages.confirm-delete'),
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

  this.request(this.api.delete<unknown>(`${route}/${phone.id}`)).subscribe({
    next: (res) => {
      if (this.handleApiFailure(res)) {
        return;
      }

      this.handleApiSuccess(res);

      this.phones.update((current) => {
        const phones = current.filter((item) => item.id !== phone.id);

        this.personUpdated.emit({ phones });

        return phones;
      });
    },
    error: () => this.ignoreHandledRequestError(),
  });
}
}
