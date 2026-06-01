import { CommonModule } from '@angular/common';
import { Component, computed, OnInit, signal, Type } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '../../../shared/base/skolans-base-component';
import {
  ScreenChildItem,
  ScreenOptionItem,
} from '../../../shared/interfaces/configuration.interfaces';
import { PersonProfileTabComponent } from '../../people/profile-tabs/person-profile-tab/person-profile-tab.component';
import { PersonCommunicationTabComponent } from '../../people/profile-tabs/person-communication-tab/person-communication-tab.component';
import { UserRolesTabComponent } from '../../people/profile-tabs/user-roles-tab/user-roles-tab.component';
import { UserSecurityTabComponent } from '../../people/profile-tabs/user-security-tab/user-security-tab.component';
import { PersonSectionsTabComponent } from '../../people/profile-tabs/person-sections-tab/person-sections-tab.component';
import { PersonLevelsTabComponent } from '../../people/profile-tabs/person-levels-tab/person-levels-tab.component';
import { PersonDirectCommunicationTabComponent } from '../../people/profile-tabs/person-direct-communication-tab/person-direct-communication-tab.component';

import { IPersonCommunicationCatalogs } from '../../people/profile-tabs/person-communication.interfaces';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { StaffPhotoModalComponent } from '../staff-photo-modal/staff-photo-modal.component';
import { SklConfirmModal } from '@shared/base/skl-confirm-modal/skl-confirm-modal';
import { Router } from '@angular/router';

interface StaffPerson {
  id: number;
  name: string;
  lastname: string;
  mothername?: string | null;
  photo?: string | null;
  [key: string]: any;
}

interface StaffUser {
  id: number;
  email: string;
  active: boolean;
  role?: {
    id: number;
    name: string;
    translation: string;
  } | null;
}

interface PersonField {
  id: number;
  name: string;
  translation: string;
  required: boolean;
  visible: boolean;
}

interface StaffProfileData {
  options?: ScreenOptionItem[];
  children?: ScreenChildItem[];
  active_tab: string | null;
  person: StaffPerson | null;
  user: StaffUser | null;
  person_fields: PersonField[];
  catalogs: StaffProfileCatalogs;
  assignments: StaffProfileAssignments;
}

interface StaffProfileChild {
  id: number;
  name: string;
  translation: string;
  icon: string;
  parent_id: number;
  module_id: number;
  color: string;
  has_children: boolean;
}

interface StaffProfileCatalogs {
  person_profile: {
    genders: any[];
    marital_statuses: any[];
    blood_types: any[];
    direct_types: any[];
  };
  communication: IPersonCommunicationCatalogs;
  sections: any[];
  levels: any[];
  roles: any[];
  direct_types: any[];
}

interface StaffProfileAssignments {
  sections: any[];
  levels: any[];
  roles: any[];
}

@Component({
  selector: 'app-staff-profile',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    UiButtonComponent,
    PersonProfileTabComponent,
    UserSecurityTabComponent,
    PersonCommunicationTabComponent,
    PersonSectionsTabComponent,
    PersonLevelsTabComponent,
    UserRolesTabComponent,
    PersonDirectCommunicationTabComponent,
  ],
  templateUrl: './staff-profile.component.html',
  styleUrl: './staff-profile.component.scss',
})
export class StaffProfileComponent extends SkolansBaseComponent implements OnInit {
  protected readonly person = signal<StaffPerson | null>(null);
  protected readonly user = signal<StaffUser | null>(null);
  protected readonly person_fields = signal<PersonField[]>([]);
  protected readonly activeTab = signal<string | null>(null);
  protected readonly catalogs = signal<StaffProfileCatalogs | null>(null);
  protected readonly assignments = signal<StaffProfileAssignments | null>(null);
  protected readonly showPhotoModal = signal(false);

  protected readonly communicationCatalogs = computed(() => {
    return this.catalogs()?.communication ?? null;
  });

  constructor(private readonly router: Router) {
    super();
  }

  ngOnInit(): void {
    this.initRouteMeta();
    this.loadProfile();
  }

  protected profileSaveRoute(): string | null {
    const route = this.apiRoute();
    const personId = this.person()?.id;

    if (!route || !personId) {
      return null;
    }

    return `${route}/${personId}`;
  }

  protected loadProfile(): void {
    const route = this.apiRoute();
    const personId = this.activatedRoute.snapshot.paramMap.get('personId');

    if (!route || !personId) {
      return;
    }

    this.executeSilentRequest(this.api.get<StaffProfileData>(`${route}/${personId}`), (res) => {
      this.setScreenOptions(res.data.options);
      this.options.set(res.data.options ?? []);
      this.person.set(res.data.person);
      this.user.set(res.data.user);
      this.person_fields.set(res.data.person_fields ?? []);
      this.catalogs.set(res.data.catalogs);
      this.assignments.set(res.data.assignments);

      const children = res.data.children ?? [];
      this.setScreenChildren(res.data.children ?? []);
      this.activeTab.set(res.data.active_tab);
      console.log(this.options());
    });
  }

  protected setTab(tab: string): void {
    this.activeTab.set(tab);
  }

  protected childRoute(childName: string): string | null {
    const parentRoute = this.apiRoute();
    const moduleRoute = parentRoute?.split('/')[0];

    if (!moduleRoute) {
      return null;
    }

    return `${moduleRoute}/${childName}`;
  }

  protected onPersonUpdated(changes: Partial<StaffPerson>): void {
    const current = this.person();

    if (!current) {
      return;
    }

    this.person.set({
      ...current,
      ...changes,
    });
  }

  protected onUserUpdated(changes: Partial<StaffUser>): void {
    const current = this.user();

    if (!current) {
      return;
    }

    this.user.set({
      ...current,
      ...changes,
    });
  }

  protected onAssignmentsUpdated(changes: Partial<StaffProfileAssignments>): void {
    const current = this.assignments();

    if (!current) {
      return;
    }

    this.assignments.set({
      ...current,
      ...changes,
    });
  }

  protected async onDelete(): Promise<void> {
    const currentPerson = this.person();
    const route = this.apiRoute();

    if (!currentPerson || !route) {
      return;
    }

    const confirmed = await this.modal.open<unknown, boolean>({
      component: SklConfirmModal as Type<unknown>,
      title: this.translate.instant('administration.staff-users.delete-modal.title'),
      description: this.translate.instant('administration.staff-users.delete-modal.confirm'),
      size: 'sm',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!confirmed) {
      return;
    }

    this.request(this.api.delete(`${route}/${currentPerson.id}`)).subscribe({
      next: (res: any) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        this.handleApiSuccess(res);
        this.router.navigate(['../'], {
          relativeTo: this.activatedRoute,
        });
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  async onUploadPhoto(): Promise<void> {
    const currentPerson = this.person();
    const route = this.apiRoute();

    if (!currentPerson || !route) {
      return;
    }

    const file = await this.modal.open<any, File | null>({
      component: StaffPhotoModalComponent as Type<unknown>,
      data: { person: currentPerson },
      title: this.translate.instant('administration.staff-users.photo.title'),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append('photo', file);

    this.request(this.api.post(`${route}/upload-photo/${currentPerson.id}`, formData)).subscribe({
      next: (res: any) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        const updatedPerson = res.data?.person;

        if (!updatedPerson) {
          this.loadProfile();
          return;
        }

        this.handleApiSuccess(res);
        this.person.set(updatedPerson);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  protected async onRemovePhoto(): Promise<void> {
    const currentPerson = this.person();
    const route = this.apiRoute();

    if (!currentPerson || !route) {
      return;
    }

    const confirmed = await this.modal.open<unknown, boolean>({
      component: SklConfirmModal as Type<unknown>,
      title: this.translate.instant('administration.staff-users.photo.remove-title'),
      description: this.translate.instant('administration.staff-users.photo.remove-confirm'),
      size: 'sm',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!confirmed) {
      return;
    }

    this.executeMutationRequest(
      this.api.put<{ person: StaffPerson }>(`${route}/remove-photo/${currentPerson.id}`, {}),
      (res) => {
        const updatedPerson = res.data?.person;

        if (!updatedPerson) {
          this.loadProfile();
          return;
        }

        this.person.set(updatedPerson);
      },
    );
  }
}
