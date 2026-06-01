import { CommonModule } from '@angular/common';
import { Component, computed, input, OnInit, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { ScreenOptionItem } from '@shared/interfaces/configuration.interfaces';
import { PhoneFormatPipe } from '@shared/pipes/phone-format-pipe';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';
import { FamilyMemberTutorComponent } from '../family-member-tutor/family-member-tutor.component';
import { FamilyMemberStudentComponent } from '../family-member-student/family-member-student.component';

interface FamilyProfile {
  id: number;
  code?: string | null;
  lastname: string;
  mothername?: string | null;
  full_name: string;
  display_name: string;
  tutors_count: number;
  students_count: number;
}

interface FamilyTutorStatus {
  id: number;
  name: string;
  translation: string;
  css_class: string;
}

interface FamilyTutorType {
  id: number;
  name: string;
  translation: string;
  css_class?: string | null;
}

interface FamilyPersonPhone {
  id: number;
  phone: string;
  phone_type_id: number;
  country_id: number;
  person_id: number;
}

interface FamilyTutorUser {
  id: number;
  email: string;
  active: boolean;
  role_id: number;
}

interface FamilyTutorPerson {
  id: number;
  context: string;
  name: string;
  lastname: string;
  mothername?: string | null;
  picture?: string | null;
  full?: string;
  full_name: string;
  photo: string;
  initials: string;
  user?: FamilyTutorUser | null;
  phones?: FamilyPersonPhone[];
}

interface FamilyTutor {
  id: number;
  family_id: number;
  person_id: number;
  tutor_type_id: number;
  tutor_status_id: number;
  main_contact: boolean;
  order: number;
  person: FamilyTutorPerson;
  tutor_type?: FamilyTutorType | null;
  tutor_status?: FamilyTutorStatus | null;
}

interface FamilyStudentStatus {
  id: number;
  name: string;
  translation: string;
  css_class: string;
}

interface FamilyStudentPerson {
  id: number;
  name: string;
  lastname: string;
  mothername?: string | null;
  full_name?: string;
  display_name?: string;
  picture?: string | null;
  photo: string;
}

interface FamilyStudent {
  id: number;
  enrollment?: string | null;
  student_status_id: number;
  family_id: number;
  person: FamilyStudentPerson;
  status?: FamilyStudentStatus | null;

  level?: any | null;
  grade?: any | null;
  group?: any | null;
}

interface FamilyMembersResponse {
  options: ScreenOptionItem[];
  tutors: FamilyTutor[];
  students: FamilyStudent[];
}

type SelectedFamilyMember =
  | {
      type: 'tutor';
      data: FamilyTutor;
    }
  | {
      type: 'student';
      data: FamilyStudent;
    };

@Component({
  selector: 'app-family-members',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    UiButtonComponent,
    UiIconComponent,
    PhoneFormatPipe,
    FamilyMemberTutorComponent,
    FamilyMemberStudentComponent,
  ],
  templateUrl: './family-members.component.html',
  styleUrl: './family-members.component.scss',
})
export class FamilyMembersComponent extends SkolansBaseComponent implements OnInit {
  readonly family = input.required<FamilyProfile>();
  readonly route = input<string | null>(null);

  readonly tutors = signal<FamilyTutor[]>([]);
  readonly students = signal<FamilyStudent[]>([]);
  readonly selectedMember = signal<SelectedFamilyMember | null>(null);

  readonly hasTutors = computed(() => this.tutors().length > 0);
  readonly hasStudents = computed(() => this.students().length > 0);

  readonly tutorsCount = computed(() => this.tutors().length);
  readonly studentsCount = computed(() => this.students().length);

  readonly isListView = computed(() => this.selectedMember() === null);
  readonly isTutorDetail = computed(() => this.selectedMember()?.type === 'tutor');
  readonly isStudentDetail = computed(() => this.selectedMember()?.type === 'student');

  ngOnInit(): void {
    this.loadMembers();
  }

  loadMembers(): void {
    const route = this.route();
    const family = this.family();

    if (!route || !family?.id) {
      return;
    }

    this.executeSilentRequest<FamilyMembersResponse>(
      this.api.get<FamilyMembersResponse>(`${route}/${family.id}`),
      (res) => {
        this.setScreenOptions(res.data.options ?? []);
        this.tutors.set(res.data.tutors ?? []);
        this.students.set(res.data.students ?? []);
      },
    );
  }

  selectTutor(tutor: FamilyTutor): void {
    this.selectedMember.set({
      type: 'tutor',
      data: tutor,
    });
  }

  selectStudent(student: FamilyStudent): void {
    this.selectedMember.set({
      type: 'student',
      data: student,
    });
  }

  backToMembers(): void {
    this.selectedMember.set(null);
  }

  initials(person?: FamilyTutorPerson | FamilyStudentPerson | null): string {
    if (!person) {
      return '';
    }

    return [person.name?.charAt(0), person.lastname?.charAt(0)]
      .filter(Boolean)
      .join('')
      .toUpperCase();
  }

  fullName(person?: FamilyTutorPerson | FamilyStudentPerson | null): string {
    if (!person) {
      return '';
    }

    return (
      person.full_name ||
      [person.name, person.lastname, person.mothername].filter(Boolean).join(' ')
    );
  }

  protected memberRoute(controller: string): string | null {
    const parentRoute = this.route();

    if (!parentRoute) {
      return null;
    }

    const [module] = parentRoute.split('/');

    if (!module) {
      return null;
    }

    return `${module}/${controller}`;
  }

  onTutorUpdated(updatedTutor: FamilyTutor): void {
    this.tutors.update((tutors) =>
      tutors.map((tutor) => (tutor.id === updatedTutor.id ? updatedTutor : tutor)),
    );

    const selected = this.selectedMember();

    if (selected?.type === 'tutor' && selected.data.id === updatedTutor.id) {
      this.selectedMember.set({
        type: 'tutor',
        data: updatedTutor,
      });
    }
  }

  onStudentUpdated(updatedStudent: FamilyStudent): void {
    this.students.update((students) =>
      students.map((student) => (student.id === updatedStudent.id ? updatedStudent : student)),
    );

    const selected = this.selectedMember();

    if (selected?.type === 'student' && selected.data.id === updatedStudent.id) {
      this.selectedMember.set({
        type: 'student',
        data: updatedStudent,
      });
    }
  }
}
