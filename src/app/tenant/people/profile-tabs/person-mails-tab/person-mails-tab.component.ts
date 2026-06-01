import { CommonModule } from '@angular/common';
import {
  Component,
  OnChanges,
  SimpleChanges,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '../../../../shared/base/skolans-base-component';
import { UiIconComponent } from '../../../../shared/ui/ui-icon/ui-icon';
import { UiButtonComponent } from '../../../../shared/ui/ui-button/ui-button';

import {
  IPersonCommunicationCatalogItem,
  IPersonMail,
  IPersonMailModalData,
  IPersonMailModalResult,
} from '../person-communication.interfaces';

import { PersonMailModalComponent } from '../person-mail-modal/person-mail-modal.component';
import { SklConfirmModal } from '../../../../shared/base/skl-confirm-modal/skl-confirm-modal';

interface PersonMailsOptionsResponse {
  options?: any[];
}

@Component({
  selector: 'app-person-mails-tab',
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    UiIconComponent,
    UiButtonComponent,
    TranslatePipe,
  ],
  templateUrl: './person-mails-tab.component.html',
  styleUrl: './person-mails-tab.component.scss',
})
export class PersonMailsTabComponent extends SkolansBaseComponent implements OnChanges {
  person = input<any | null>(null);
  mailTypes = input<IPersonCommunicationCatalogItem[]>([]);
  route = input<string | null>(null);
  personUpdated = output<Partial<any>>();

  protected readonly mails = signal<IPersonMail[]>([]);
  protected readonly defaultEmail = computed(() => this.person()?.user?.email ?? null);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['person']) {
      this.syncPersonMails();
    }

    if (changes['route']) {
      this.loadOptions();
    }
  }

  private syncPersonMails(): void {
    this.mails.set(this.person()?.mails ?? []);
  }

  private loadOptions(): void {
    const route = this.route();

    if (!route) {
      this.options.set([]);
      return;
    }

    this.executeSilentRequest(
      this.api.get<PersonMailsOptionsResponse>(route),
      (res) => {
        this.options.set(res.data?.options ?? []);
      },
      () => {
        this.options.set([]);
      },
    );
  }

  protected mailTypeLabel(mailTypeId: number | null | undefined): string {
    if (!mailTypeId) {
      return 'Cuenta de acceso';
    }

    const type = this.mailTypes().find((item) => item.id === mailTypeId);

    return type?.translation || type?.description || type?.name || 'Sin tipo';
  }

  protected async onAdd(): Promise<void> {
    const route = this.route();
    const personId = this.person()?.id;

    if (!route || !personId) {
      return;
    }

    const result = await this.modal.open<IPersonMailModalData, IPersonMailModalResult>({
      component: PersonMailModalComponent,
      data: {
        personId,
        email: null,
        mailTypes: this.mailTypes(),
      },
      title: this.translate.instant('administration.person-mails.add'),
      description: this.translate.instant(
        'administration.person-mails.messages.update-description',
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
      this.api.post<{ mail: IPersonMail }>(route, result.payload),
      (res) => {
        const insertedMail = res.data?.mail;

        if (!insertedMail) {
          return;
        }

        this.mails.update((current) => {
          const mails = [...current, insertedMail];

          this.personUpdated.emit({ mails });

          return mails;
        });
      },
    );
  }

  protected async onEdit(email: IPersonMail): Promise<void> {
    const route = this.route();

    if (!route || !email.id) {
      return;
    }

    const result = await this.modal.open<IPersonMailModalData, IPersonMailModalResult>({
      component: PersonMailModalComponent,
      data: {
        personId: this.person().id,
        email,
        mailTypes: this.mailTypes(),
      },
      title: this.translate.instant('administration.person-mails.update'),
      description: this.translate.instant(
        'administration.person-mails.messages.update-description',
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
      this.api.put<{ mail: IPersonMail }>(`${route}/${email.id}`, result.payload),
      (res) => {
        const updatedMail = res.data?.mail;

        if (!updatedMail) {
          return;
        }

        this.mails.update((mails) => {
          const updated = mails.map((item) => (item.id === updatedMail.id ? updatedMail : item));

          this.personUpdated.emit({ mails: updated });

          return updated;
        });
      },
    );
  }

  protected async onDelete(email: IPersonMail): Promise<void> {
    const route = this.route();
    if (!route || !email) {
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
      title: this.translate.instant('administration.person-mails.delete'),
      data: {
        message: this.translate.instant('administration.person-mails.messages.confirm-delete'),
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

    this.request(this.api.delete<unknown>(`${route}/${email.id}`)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }
        this.handleApiSuccess(res);
        this.mails.update((current) => {
          const updated = current.filter((item) => item.id !== email.id);

          this.personUpdated.emit({ mails: updated });

          return updated;
        });
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }
}
