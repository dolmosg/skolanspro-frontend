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
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '../../../../shared/base/skolans-base-component';

import { PersonMailsTabComponent } from '../person-mails-tab/person-mails-tab.component';
import { PersonPhonesTabComponent } from '../person-phones-tab/person-phones-tab.component';
import { PersonAddressTabComponent } from '../person-address-tab/person-address-tab.component';

import { IPersonCommunicationCatalogs } from '../person-communication.interfaces';
import { ScreenChildItem } from '@shared/interfaces/access.interfaces';

interface PersonCommunicationsResponse {
  children?: ScreenChildItem[];
}

@Component({
  selector: 'app-person-communication-tab',
  imports: [
    CommonModule,
    TranslatePipe,
    PersonMailsTabComponent,
    PersonPhonesTabComponent,
    PersonAddressTabComponent,
  ],
  templateUrl: './person-communication-tab.component.html',
  styleUrl: './person-communication-tab.component.scss',
})
export class PersonCommunicationTabComponent extends SkolansBaseComponent implements OnChanges {
  person = input<any | null>(null);
  route = input<string | null>(null);
  catalogs = input<IPersonCommunicationCatalogs | null>(null);
  personUpdated = output<Partial<any>>();

  protected readonly activeChild = signal<ScreenChildItem | null>(null);

  protected readonly hasChildren = computed(() => this.children().length > 0);

  protected readonly phoneTypes = computed(() => this.catalogs()?.phone_types ?? []);
  protected readonly mailTypes = computed(() => this.catalogs()?.mail_types ?? []);
  protected readonly addressTypes = computed(() => this.catalogs()?.address_types ?? []);
  protected readonly countries = computed(() => this.catalogs()?.countries ?? []);
  protected readonly defaultCountryId = computed(() => this.catalogs()?.default_country_id ?? null);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['route']) {
      this.loadChildren();
    }
  }

  protected onPersonUpdated(changes: Partial<any>): void {
    this.personUpdated.emit({
      ...this.person(),
      ...changes,
    });
  }

  protected loadChildren(): void {
    const route = this.route();

    if (!route) {
      this.children.set([]);
      this.activeChild.set(null);
      return;
    }

    this.executeSilentRequest(
      this.api.get<PersonCommunicationsResponse>(route),
      (res) => {
        const children = res.data?.children ?? [];

        this.setScreenChildren(children);
        this.activeChild.set(children[0] ?? null);
      },
      () => {
        this.children.set([]);
        this.activeChild.set(null);
      },
    );
  }

  protected selectChild(child: ScreenChildItem): void {
    this.activeChild.set(child);
  }

  protected childKey(child: ScreenChildItem | null): string {
    const value = child?.name ?? child?.route ?? '';

    if (value.includes('mail')) return 'mails';
    if (value.includes('phone')) return 'phones';
    if (value.includes('address')) return 'address';

    return '';
  }

  protected tabLabel(child: ScreenChildItem): string {
    return child.translation ?? child.name;
  }

  protected childRoute(childName: string): string | null {
    const parentRoute = this.route();
    const moduleRoute = parentRoute?.split('/')[0];

    if (!moduleRoute) {
      return null;
    }

    return `${moduleRoute}/${childName}`;
  }
}
