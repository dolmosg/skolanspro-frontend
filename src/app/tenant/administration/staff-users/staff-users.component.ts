import { Component, computed, signal, Type } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Router } from '@angular/router';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { SkSelectComponent } from '@shared/ui/sk-select/sk-select.component';

import { StaffUserModalComponent } from '../staff-user-modal/staff-user-modal.component';

interface StaffUserResult {
  id: number | null;
  email: string | null;
  context: string | null;
  person: {
    id: number;
    name: string | null;
    lastname: string | null;
    mothername: string | null;
  };
  role: any | null;
}

interface PersonField {
  id: number;
  name: string;
  translation: string;
  required: boolean;
  visible: boolean;
  protected?: boolean;
  order?: number;
}

interface StaffUsersCatalogs {
  person_profile: {
    genders: any[];
    marital_statuses: any[];
    blood_types: any[];
  };
  roles: any[];
}

interface StaffUsersIndexResponse {
  options: any[];
  roles: any[];
  person_fields: PersonField[];
  catalogs: StaffUsersCatalogs;
}

interface StaffUsersSearchResponse {
  users: StaffUserResult[];
  has_more: boolean;
}

@Component({
  selector: 'app-staff-users',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule, UiButtonComponent, SkSelectComponent],
  templateUrl: './staff-users.component.html',
  styleUrl: './staff-users.component.scss',
})
export class StaffUsersComponent extends SkolansBaseComponent {
  constructor(private router: Router) {
    super();
  }

  private readonly fb = new FormBuilder();

  roles = signal<any[]>([]);
  personFields = signal<PersonField[]>([]);
  catalogs = signal<StaffUsersCatalogs | null>(null);
  users = signal<StaffUserResult[]>([]);
  hasMore = signal(false);
  searched = signal(false);

  form = this.fb.group({
    name: [''],
    lastname: [''],
    mothername: [''],
    email: [''],
    role_id: [null as number | null],
  });

  canAdd = computed(() => this.options().some((option) => option.name === 'add'));

  ngOnInit(): void {
    this.initRouteMeta();
    this.loadOptions();
  }

  loadOptions(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.executeSilentRequest<StaffUsersIndexResponse>(
      this.api.get<StaffUsersIndexResponse>(route),
      (res) => {
        this.options.set(res.data.options ?? []);
        this.roles.set(res.data.catalogs?.roles ?? res.data.roles ?? []);
        this.personFields.set(res.data.person_fields ?? []);
        this.catalogs.set(res.data.catalogs ?? null);
      },
    );
  }

  search(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    const payload = this.cleanPayload(this.form.value);

    if (Object.keys(payload).length === 0) {
      this.toast.warning(this.translate.instant('security.users.messages.search-filter-required'));
      return;
    }

    this.executeSilentRequest<StaffUsersSearchResponse>(
      this.api.post<StaffUsersSearchResponse>(`${route}/search`, payload),
      (res) => {
        this.users.set(res.data.users ?? []);
        this.hasMore.set(res.data.has_more ?? false);
        this.searched.set(true);
      },
    );
  }

  reset(): void {
    this.form.reset({
      name: '',
      lastname: '',
      mothername: '',
      email: '',
      role_id: null,
    });

    this.users.set([]);
    this.hasMore.set(false);
    this.searched.set(false);
  }

  async onAdd(): Promise<void> {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    const payload = await this.modal.open<any, Record<string, any> | null>({
      component: StaffUserModalComponent as Type<unknown>,
      data: {
        personFields: this.personFields(),
        catalogs: this.catalogs(),
        roles: this.roles(),
      },
      title: this.translate.instant('administration.staff-users.modal.title'),
      size: 'lg',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!payload) {
      return;
    }

    this.request(this.api.post(route, payload)).subscribe({
      next: (res: any) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        this.handleApiSuccess(res);

        const personId = res.data?.person?.id;

        if (personId) {
          this.goToDetail(personId);
          return;
        }

        this.search();
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  goToDetail(personId: number): void {
    this.router.navigate([personId], {
      relativeTo: this.activatedRoute,
    });
  }

  private cleanPayload(value: any): Record<string, any> {
    return Object.entries(value).reduce(
      (payload, [key, fieldValue]) => {
        if (fieldValue !== null && fieldValue !== undefined && fieldValue !== '') {
          payload[key] = fieldValue;
        }

        return payload;
      },
      {} as Record<string, any>,
    );
  }
}