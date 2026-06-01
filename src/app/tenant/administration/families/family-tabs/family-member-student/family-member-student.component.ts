import { CommonModule } from '@angular/common';
import { Component, computed, input, OnInit, output, signal, Type } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

import { PersonProfileTabComponent } from '../../../../people/profile-tabs/person-profile-tab/person-profile-tab.component';
import { UserSecurityTabComponent } from '../../../../people/profile-tabs/user-security-tab/user-security-tab.component';
import { PersonCommunicationTabComponent } from '../../../../people/profile-tabs/person-communication-tab/person-communication-tab.component';

import { IPersonCommunicationCatalogs } from '../../../../people/profile-tabs/person-communication.interfaces';
import { StudentYearsComponent } from '../../student-tabs/student-years/student-years.component';
import { StaffPhotoModalComponent } from 'app/tenant/administration/staff-photo-modal/staff-photo-modal.component';
import { SklConfirmModal } from '@shared/base/skl-confirm-modal/skl-confirm-modal';

interface FamilyProfile {
  id: number;
  full_name: string;
  display_name: string;
}

interface FamilyStudentYear {
  id: number;
  special_education: boolean;
  complements: boolean;
  grade_id: number;
  school_year_id: number;
  student_id: number;
  student_year_status_id: number;
  school_year?: any | null;
  grade?: any | null;
  status?: any | null;
}

interface FamilyStudent {
  id: number;
  family_id: number;
  person_id?: number;
  student_status_id: number;
  enrollment?: string | null;
  comment?: string | null;
  qr_filename?: string | null;
  unsubscribed_at?: string | null;
  person: any;
  status?: any | null;
  years?: FamilyStudentYear[];
  current_year?: FamilyStudentYear | null;
}

interface FamilyMemberStudentCatalogs {
  person_profile: {
    genders: any[];
    marital_statuses: any[];
    blood_types: any[];
    direct_types: any[];
  };
  communication: IPersonCommunicationCatalogs;
  roles: any[];
}

interface FamilyMemberStudentResponse {
  options: any[];
  children: any[];
  active_tab: string | null;
  student: FamilyStudent;
  person: any;
  user: any;
  person_fields: any[];
  catalogs: FamilyMemberStudentCatalogs;
}

@Component({
  selector: 'app-family-member-student',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    UiButtonComponent,
    PersonProfileTabComponent,
    UserSecurityTabComponent,
    PersonCommunicationTabComponent,
    StudentYearsComponent,
  ],
  templateUrl: './family-member-student.component.html',
  styleUrl: './family-member-student.component.scss',
})
export class FamilyMemberStudentComponent extends SkolansBaseComponent implements OnInit {
  readonly family = input.required<FamilyProfile>();
  readonly student = input.required<FamilyStudent>();
  readonly route = input<string | null>(null);

  readonly studentUpdated = output<FamilyStudent>();

  readonly person = signal<any | null>(null);
  readonly user = signal<any | null>(null);
  readonly personFields = signal<any[]>([]);
  readonly catalogs = signal<FamilyMemberStudentCatalogs | null>(null);
  readonly activeTab = signal<string | null>('person-profile');

  readonly loadedStudent = signal<FamilyStudent | null>(null);

  readonly currentYear = computed(() => {
    return this.loadedStudent()?.current_year ?? null;
  });

  readonly studentYears = computed(() => {
    return this.loadedStudent()?.years ?? [];
  });

  readonly currentSchoolYear = computed(() => {
    return this.currentYear()?.school_year ?? null;
  });

  readonly currentGrade = computed(() => {
    return this.currentYear()?.grade ?? null;
  });

  readonly currentLevel = computed(() => {
    return this.currentYear()?.grade?.level ?? null;
  });

  readonly communicationCatalogs = computed(() => {
    return this.catalogs()?.communication ?? null;
  });

  ngOnInit(): void {
    this.loadStudent();
  }

  loadStudent(): void {
    const route = this.route();
    const student = this.student();

    if (!route || !student?.id) {
      return;
    }

    this.executeSilentRequest<FamilyMemberStudentResponse>(
      this.api.get<FamilyMemberStudentResponse>(`${route}/${student.id}`),
      (res) => {
        this.setScreenOptions(res.data.options ?? []);
        this.setScreenChildren(res.data.children ?? []);

        const loadedStudent = res.data.student ?? null;

        // 🔹 AQUÍ guardas el alumno completo
        this.loadedStudent.set(loadedStudent);

        // 🔹 Y de aquí derivan person y user
        this.person.set(res.data.person ?? loadedStudent?.person ?? null);
        this.user.set(res.data.user ?? loadedStudent?.person?.user ?? null);

        this.personFields.set(res.data.person_fields ?? []);
        this.catalogs.set(res.data.catalogs ?? null);
        this.activeTab.set(res.data.active_tab ?? 'person-profile');
      },
    );
  }

  setTab(tab: string): void {
    this.activeTab.set(tab);
  }

  childRoute(childName: string): string | null {
    const parentRoute = this.route();
    const moduleRoute = parentRoute?.split('/')[0];

    if (!moduleRoute) {
      return null;
    }

    return `${moduleRoute}/${childName}`;
  }

  profileSaveRoute(): string | null {
    const route = this.route();
    const personId = this.person()?.id;

    if (!route || !personId) {
      return null;
    }

    return `${route}/person/${personId}`;
  }

  onPersonUpdated(person: any): void {
    this.person.set(person);

    this.studentUpdated.emit({
      ...(this.loadedStudent() ?? this.student()),
      person,
    });
  }

  onUserUpdated(user: any): void {
    this.user.set(user);

    const currentPerson = this.person();

    if (!currentPerson) {
      return;
    }

    const updatedPerson = {
      ...currentPerson,
      user,
    };

    this.person.set(updatedPerson);

    this.studentUpdated.emit({
      ...(this.loadedStudent() ?? this.student()),
      person: updatedPerson,
    });
  }

  onDelete() {}

  async onUploadPhoto(): Promise<void> {
  const currentPerson = this.person();
  const route = this.route();

  if (!currentPerson || !route) {
    return;
  }

  const file = await this.modal.open<any, File | null>({
    component: StaffPhotoModalComponent as Type<unknown>,
    data: { person: currentPerson },
    title: this.translate.instant('administration.family-students.photo.title'),
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

      const updatedStudent = {
        ...(this.loadedStudent() ?? this.student()),
        person: updatedPerson,
      };

      this.loadedStudent.set(updatedStudent);
      this.studentUpdated.emit(updatedStudent);
    },
  );
}

async onRemovePhoto(): Promise<void> {
  const currentPerson = this.person();
  const route = this.route();

  if (!currentPerson || !route) {
    return;
  }

  const confirmed = await this.modal.open<any, boolean>({
    component: SklConfirmModal as Type<unknown>,
    title: this.translate.instant('administration.family-students.photo.remove-title'),
    size: 'sm',
    closeOnBackdrop: true,
    closeOnEscape: true,
    showCloseButton: true,
    data: {
      message: this.translate.instant('administration.family-students.photo.remove-confirm'),
      confirmLabel: this.translate.instant('common.remove'),
      cancelLabel: this.translate.instant('common.cancel'),
      type: 'danger',
    },
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

      const updatedStudent = {
        ...(this.loadedStudent() ?? this.student()),
        person: updatedPerson,
      };

      this.loadedStudent.set(updatedStudent);
      this.studentUpdated.emit(updatedStudent);
    },
  );
}
}
