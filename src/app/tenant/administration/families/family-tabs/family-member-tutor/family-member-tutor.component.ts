import { CommonModule } from '@angular/common';
import { Component, computed, input, output, signal, Type } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';

import { PersonProfileTabComponent } from '../../../../people/profile-tabs/person-profile-tab/person-profile-tab.component';
import { UserSecurityTabComponent } from '../../../../people/profile-tabs/user-security-tab/user-security-tab.component';
import { PersonCommunicationTabComponent } from '../../../../people/profile-tabs/person-communication-tab/person-communication-tab.component';

import { IPersonCommunicationCatalogs } from '../../../../people/profile-tabs/person-communication.interfaces';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { StaffPhotoModalComponent } from 'app/tenant/administration/staff-photo-modal/staff-photo-modal.component';
import { SklConfirmModal } from '@shared/base/skl-confirm-modal/skl-confirm-modal';

interface FamilyProfile {
  id: number;
  full_name: string;
  display_name: string;
}

interface FamilyTutor {
  id: number;
  family_id: number;
  person_id: number;
  tutor_type_id: number;
  tutor_status_id: number;
  main_contact: boolean;
  order: number;
  person: any;
  tutor_type?: any;
  tutor_status?: any;
}

interface FamilyMemberTutorResponse {
  options: any[];
  children: any[];
  active_tab: string | null;
  person: any;
  user: any;
  person_fields: any[];
  catalogs: {
    person_profile: {
      genders: any[];
      marital_statuses: any[];
      blood_types: any[];
      direct_types: any[];
    };
    communication: IPersonCommunicationCatalogs;
    roles: any[];
    default_country_id: number | null;
  };
  tutor: FamilyTutor;
}

@Component({
  selector: 'app-family-member-tutor',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    UiButtonComponent,
    PersonProfileTabComponent,
    UserSecurityTabComponent,
    PersonCommunicationTabComponent,
  ],
  templateUrl: './family-member-tutor.component.html',
  styleUrl: './family-member-tutor.component.scss',
})
export class FamilyMemberTutorComponent extends SkolansBaseComponent {
  readonly family = input.required<FamilyProfile>();
  readonly tutor = input.required<FamilyTutor>();
  readonly route = input<string | null>(null);

  readonly back = output<void>();
  tutorUpdated = output<FamilyTutor>();

  readonly person = signal<any | null>(null);
  readonly user = signal<any | null>(null);
  readonly personFields = signal<any[]>([]);
  readonly catalogs = signal<FamilyMemberTutorResponse['catalogs'] | null>(null);
  readonly activeTab = signal<string | null>('person-profile');

  readonly communicationCatalogs = computed(() => {
    return this.catalogs()?.communication ?? null;
  });

  readonly profileCatalogs = computed(() => {
    return this.catalogs()?.person_profile ?? null;
  });

  ngOnInit(): void {
    this.loadTutor();
  }

  loadTutor(): void {
    const route = this.route();
    const tutor = this.tutor();

    if (!route || !tutor?.id) {
      return;
    }

    this.executeSilentRequest<FamilyMemberTutorResponse>(
      this.api.get<FamilyMemberTutorResponse>(`${route}/${tutor.id}`),
      (res) => {
        this.setScreenOptions(res.data.options ?? []);
        this.setScreenChildren(res.data.children ?? []);

        this.person.set(res.data.person ?? res.data.tutor?.person ?? null);
        this.user.set(res.data.user ?? res.data.tutor?.person?.user ?? null);
        this.personFields.set(res.data.person_fields ?? []);
        this.catalogs.set(res.data.catalogs ?? null);
        this.activeTab.set(res.data.active_tab ?? 'person-profile');
      },
    );
  }

  setTab(tab: string): void {
    this.activeTab.set(tab);
  }

  profileSaveRoute(): string | null {
    const route = this.route();
    const personId = this.person()?.id;

    if (!route || !personId) {
      return null;
    }

    return `${route}/person/${personId}`;
  }

  childRoute(childName: string): string | null {
    const parentRoute = this.route();
    const moduleRoute = parentRoute?.split('/')[0];

    if (!moduleRoute) {
      return null;
    }

    return `${moduleRoute}/${childName}`;
  }

  onPersonUpdated(person: any): void {
    this.person.set(person);

    const currentTutor = this.tutor();

    if (!currentTutor) {
      return;
    }

    const updatedTutor = {
      ...currentTutor,
      person,
    };

    this.tutorUpdated.emit(updatedTutor);
  }

  onUserUpdated(user: any): void {
    this.user.set(user);

    const currentPerson = this.person();
    const currentTutor = this.tutor();

    if (!currentPerson || !currentTutor) {
      return;
    }

    const updatedPerson = {
      ...currentPerson,
      user,
    };

    this.person.set(updatedPerson);

    this.tutorUpdated.emit({
      ...currentTutor,
      person: updatedPerson,
    });
  }

  async onUploadPhoto(): Promise<void> {
    const currentPerson = this.person();
    const route = this.route();

    if (!currentPerson || !route) {
      return;
    }

    const file = await this.modal.open<any, File | null>({
      component: StaffPhotoModalComponent as Type<unknown>,
      data: { person: currentPerson },
      title: this.translate.instant('administration.family-tutors.photo.title'),
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

    this.executeMutationRequest(
      this.api.post<{ person: any }>(`${route}/upload-photo/${currentPerson.id}`, formData),
      (res) => {
        const updatedPerson = res.data?.person;

        if (!updatedPerson) {
          return;
        }

        this.person.set(updatedPerson);

        this.tutorUpdated.emit({
          ...this.tutor(),
          person: updatedPerson,
        });
      },
    );
  }

  protected async onRemovePhoto(): Promise<void> {
    const currentPerson = this.person();
    const route = this.route();

    if (!currentPerson || !route) {
      return;
    }

    const confirmed = await this.modal.open<unknown, boolean>({
      component: SklConfirmModal as Type<unknown>,
      title: this.translate.instant('administration.family-tutors.photo.remove-title'),
      description: this.translate.instant('administration.family-tutors.photo.remove-confirm'),
      size: 'sm',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!confirmed) {
      return;
    }

    this.executeMutationRequest(
      this.api.put<{ person: any }>(`${route}/remove-photo/${currentPerson.id}`, {}),
      (res) => {
        const updatedPerson = res.data?.person;

        if (!updatedPerson) {
          return;
        }

        this.person.set(updatedPerson);

        this.tutorUpdated.emit({
          ...this.tutor(),
          person: updatedPerson,
        });
      },
    );
  }
  onDelete() {}
}
