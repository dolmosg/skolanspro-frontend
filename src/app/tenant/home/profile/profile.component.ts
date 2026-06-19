import { Component, OnInit, Type, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { ScreenChildItem, ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import { AuthStateSevice } from '@shared/services/auth-state-sevice';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';
import { PersonCommunicationTabComponent } from 'app/tenant/people/profile-tabs/person-communication-tab/person-communication-tab.component';
import { IPersonCommunicationCatalogs } from 'app/tenant/people/profile-tabs/person-communication.interfaces';
import { PersonProfileTabComponent } from 'app/tenant/people/profile-tabs/person-profile-tab/person-profile-tab.component';
import { PersonPasswordTabComponent } from 'app/tenant/people/profile-tabs/person-password-tab/person-password-tab.component';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { StaffPhotoModalComponent } from 'app/tenant/administration/staff-photo-modal/staff-photo-modal.component';
import { SklConfirmModal } from '@shared/base/skl-confirm-modal/skl-confirm-modal';

interface IPerson {
  id: number;
  context: string;
  name: string;
  lastname: string;
  mothername?: string | null;
  full?: string | null;
  full_name?: string | null;
  initials?: string | null;
  picture?: string | null;
  photo?: string | null;
  birthdate?: string | null;
  user?: IUser | null;
  mails?: unknown[];
  phones?: unknown[];
  addresses?: unknown[];
  [key: string]: unknown;
}

interface IUser {
  id: number;
  email: string;
  active: boolean;
  force_password?: boolean;
  role?: {
    id: number;
    name: string;
    translation: string;
    path?: string;
  } | null;
}

interface PersonField {
  id: number;
  name: string;
  translation: string;
  required: boolean;
  visible: boolean;
}

interface StaffProfileCatalogs {
  person_profile: {
    genders: any[];
    marital_statuses: any[];
    blood_types: any[];
    direct_types: any[];
  };
  communication: IPersonCommunicationCatalogs;
}

interface StaffProfileData {
  options?: ScreenOptionItem[];
  children?: ScreenChildItem[];
  active_tab?: string | null;
  person: IPerson | null;
  person_fields?: PersonField[];
  catalogs: StaffProfileCatalogs;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    UiIconComponent,
    UiButtonComponent,
    TranslatePipe,
    PersonProfileTabComponent,
    PersonCommunicationTabComponent,
    PersonPasswordTabComponent,
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent extends SkolansBaseComponent implements OnInit {
  private readonly authState = inject(AuthStateSevice);

  /**
   * Authenticated user stored in the current session.
   * Useful as immediate fallback while the profile endpoint loads.
   */
  protected readonly sessionUser = this.authState.user;

  protected readonly person = signal<IPerson | null>(null);
  protected readonly user = signal<IUser | null>(null);
  protected readonly personFields = signal<PersonField[]>([]);
  protected readonly catalogs = signal<StaffProfileCatalogs | null>(null);
  protected readonly activeTab = signal<string | null>(null);

  protected readonly communicationCatalogs = computed(() => {
    return this.catalogs()?.communication ?? null;
  });

  protected readonly displayName = computed(() => {
    return (
      this.person()?.full_name ||
      this.sessionUser()?.person?.full_name ||
      this.sessionUser()?.name ||
      this.sessionUser()?.email ||
      ''
    );
  });

  protected readonly displayEmail = computed(() => {
    return this.user()?.email || this.sessionUser()?.email || '';
  });

  protected readonly displayPhoto = computed(() => {
    return (
      this.person()?.photo ||
      this.person()?.picture ||
      this.sessionUser()?.person?.photo ||
      this.sessionUser()?.person?.picture ||
      null
    );
  });

  protected readonly displayInitials = computed(() => {
    return (
      this.person()?.initials ||
      this.sessionUser()?.person?.initials ||
      this.sessionUser()?.initials ||
      'U'
    );
  });

  /**
   * Loads the profile screen payload when the screen initializes.
   */
  ngOnInit(): void {
    this.initRouteMeta();
    this.loadProfile();
  }

  /**
   * Requests the authenticated user's profile payload.
   *
   * Expected route data:
   * data: { apiRoute: 'home/profile' }
   */
  private loadProfile(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.executeSilentRequest(this.api.get<StaffProfileData>(route), (res) => {
      const data = res.data;

      this.setScreenOptions(data.options ?? []);
      this.setScreenChildren(data.children ?? []);

      this.person.set(data.person);
      this.user.set(data.person?.user ?? null);
      this.personFields.set(data.person_fields ?? []);
      this.catalogs.set(data.catalogs);
      this.activeTab.set(data.active_tab ?? data.children?.[0]?.name ?? null);
      console.log(this.personFields());
    });
  }

  protected profileSaveRoute(): string | null {
    const route = this.apiRoute();
    const personId = this.person()?.id;

    if (!route || !personId) {
      return null;
    }

    return `${route}/${personId}`;
  }

  protected childRoute(childName: string): string | null {
    const parentRoute = this.apiRoute();
    const moduleRoute = parentRoute?.split('/')[0];

    if (!moduleRoute) {
      return null;
    }

    return `${moduleRoute}/${childName}`;
  }

  protected onPersonUpdated(changes: Partial<IPerson>): void {
    const current = this.person();

    if (!current) {
      return;
    }

    this.person.set({
      ...current,
      ...changes,
    });
  }

  /**
   * Handles profile card actions coming from backend options.
   */
  protected onProfileOptionClick(option: string): void {
    switch (option) {
      case 'upload-photo':
        this.onUploadPhoto();
        break;

      case 'reset-photo':
        this.onRemovePhoto();
        break;

      default:
        console.warn(`Unhandled profile option: ${option}`);
        break;
    }
  }

  /**
   * Opens the upload photo workflow.
   */
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

  /**
   * Restores the default user profile photo.
   */
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
      this.api.put<{ person: IPerson }>(`${route}/remove-photo/${currentPerson.id}`, {}),
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
