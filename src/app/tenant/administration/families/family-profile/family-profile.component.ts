import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { FamilyGeneralComponent } from '../family-tabs/family-general/family-general.component';
import { FamilyMembersComponent } from '../family-tabs/family-members/family-members.component';
import { FamilyAddressComponent } from '../family-tabs/family-address/family-address.component';
import { FamilyContactsComponent } from '../family-tabs/family-contacts/family-contacts.component';
import { FamilyFinancesComponent } from '../family-tabs/family-finances/family-finances.component';
import { FamilyCollectionComponent } from '../family-tabs/family-collection/family-collection.component';

interface FamilyProfileStatus {
  id: number;
  name: string;
  translation: string;
  css_class: string;
  active: boolean;
  order: number;
}

interface FamilyProfileAddress {
  id: number;
  street: string | null;
  outdoor: string | null;
  indoor: string | null;
  colony: string | null;
  city: string | null;
  state: string | null;
  municipality: string | null;
  zip_code: string | null;
  country_id: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface FamilyProfile {
  id: number;
  code?: string | null;
  lastname: string;
  mothername?: string | null;
  full_name: string;
  display_name: string;
  email?: string | null;
  registered_at?: string | null;
  canceled_at?: string | null;
  family_status_id: number;
  tutors_count: number;
  students_count: number;
  status?: FamilyProfileStatus | null;
  address?: FamilyProfileAddress | null;
}

interface FamilyProfileResponse {
  options: any[];
  children: any[];
  family: FamilyProfile;
}

@Component({
  selector: 'app-family-profile',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    FamilyGeneralComponent,
    FamilyMembersComponent,
    FamilyAddressComponent,
    FamilyContactsComponent,
    FamilyFinancesComponent,
    FamilyCollectionComponent,
  ],
  templateUrl: './family-profile.component.html',
  styleUrl: './family-profile.component.scss',
})
export class FamilyProfileComponent extends SkolansBaseComponent {
  readonly family = signal<FamilyProfile | null>(null);
  readonly activeTab = signal<string | null>(null);

  readonly familyId = computed(() => Number(this.route.snapshot.paramMap.get('familyId')));

  readonly familyInitials = computed(() => {
    const family = this.family();

    if (!family) {
      return '';
    }

    return [family.lastname?.charAt(0), family.mothername?.charAt(0)]
      .filter(Boolean)
      .join('')
      .toUpperCase();
  });

  readonly isGeneralTab = computed(() => this.activeTab() === 'family-general');
  readonly isMembersTab = computed(() => this.activeTab() === 'family-members');
  readonly isAddressTab = computed(() => this.activeTab() === 'family-address');
  readonly isContactsTab = computed(() => this.activeTab() === 'family-contacts');
  readonly isFinancesTab = computed(() => this.activeTab() === 'family-finances');
  readonly isCollectionTab = computed(() => this.activeTab() === 'family-collection');

  constructor(private readonly route: ActivatedRoute) {
    super();
  }

  ngOnInit(): void {
    this.initRouteMeta();
    this.loadFamily();
  }

  loadFamily(): void {
    const route = this.apiRoute();
    const familyId = this.familyId();

    if (!route || !familyId) {
      return;
    }

    this.executeSilentRequest<FamilyProfileResponse>(
      this.api.get<FamilyProfileResponse>(`${route}/${familyId}`),
      (res) => {
        this.family.set(res.data.family);

        this.setScreenOptions(res.data.options ?? []);
        this.setScreenChildren(res.data.children ?? []);

        const firstChild = res.data.children?.[0] ?? null;
        this.activeTab.set(firstChild?.name ?? 'family-general');
      },
    );
  }

  selectTab(name: string): void {
    this.activeTab.set(name);
  }

  isActiveTab(name: string): boolean {
    return this.activeTab() === name;
  }

  protected childRoute(childName: string): string | null {
    const parentRoute = this.apiRoute();

    if (!parentRoute) {
      return null;
    }

    const [module] = parentRoute.split('/');

    return `${module}/${childName}`;
  }
}
