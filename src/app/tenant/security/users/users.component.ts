import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { Router } from '@angular/router';

import { UiButtonComponent } from '../../../shared/ui/ui-button/ui-button';
import { SkolansBaseComponent } from '../../../shared/base/skolans-base-component';
import { ScreenOptionItem } from '../../../shared/interfaces/configuration.interfaces';
import { SkSelectComponent } from '../../../shared/ui/sk-select/sk-select.component';
import { SklConfirmModal } from '../../../shared/base/skl-confirm-modal/skl-confirm-modal';

interface RoleListItem {
  id: number;
  name: string;
  translation: string;
  internal: boolean;
}

interface UserSearchItem {
  id: number;
  email: string;
  context: 'staff' | 'student' | 'parent' | 'unknown';
  person: {
    id: number;
    name: string;
    lastname: string;
    mothername: string | null;
  };
  role: RoleListItem | null;
}

interface UsersIndexData {
  options?: ScreenOptionItem[];
  roles: RoleListItem[];
}

interface UsersSearchData {
  users: UserSearchItem[];
}

interface UsersSearchData {
  users: UserSearchItem[];
  has_more: boolean;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    UiButtonComponent,
    TranslatePipe,
    SkSelectComponent,
    UiButtonComponent,
  ],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
})
export class UsersComponent extends SkolansBaseComponent implements OnInit {
  private readonly fb = new FormBuilder();
  private readonly router = inject(Router);

  protected readonly roles = signal<RoleListItem[]>([]);
  protected readonly users = signal<UserSearchItem[]>([]);
  protected readonly searched = signal(false);
  protected readonly hasMore = signal(false);

  protected readonly form = this.fb.group({
    name: [''],
    lastname: [''],
    mothername: [''],
    email: [''],
    role_id: [null as number | null],
  });

  ngOnInit(): void {
    this.initRouteMeta();
    this.loadIndex();
  }

  protected loadIndex(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.request(this.api.get<UsersIndexData>(route)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        this.setScreenOptions(res.data.options);
        this.roles.set(res.data.roles ?? []);
      },
      error: () => {
        this.roles.set([]);
        this.ignoreHandledRequestError();
      },
    });
  }

  protected onSearch(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    const payload = this.cleanPayload(this.form.getRawValue());

    if (!Object.keys(payload).length) {
      return;
    }

    this.request(this.api.post<UsersSearchData>(`${route}/search`, payload)).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        this.users.set(res.data.users ?? []);
        this.hasMore.set(!!res.data.has_more);
        this.searched.set(true);
      },
      error: () => {
        this.users.set([]);
        this.searched.set(true);
        this.ignoreHandledRequestError();
      },
    });
  }

  protected onAction(option: ScreenOptionItem, user: UserSearchItem): void {
    switch (option.name) {
      case 'change-password':
        this.onChangePassword(user);
        break;

      case 'profile':
        this.onProfile(user);
        break;
    }
  }

  private async onChangePassword(user: UserSearchItem): Promise<void> {
    const route = this.apiRoute();

    if (!route || !user.id) {
      return;
    }

    const confirmed = await this.modal.open<
      {
        message: string;
        confirmLabel: string;
        cancelLabel: string;
        type: 'warning';
      },
      boolean
    >({
      component: SklConfirmModal,
      title: this.translate.instant('security.users.change-password'),
      data: {
        message: this.translate.instant('security.users.messages.confirm-change-password'),
        confirmLabel: this.translate.instant('security.users.change-password'),
        cancelLabel: this.translate.instant('common.cancel'),
        type: 'warning',
      },
      size: 'sm',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!confirmed) {
      return;
    }

    this.request(this.api.put(`${route}/change-password/${user.id}`, {})).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        this.handleApiSuccess(res);
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }

  private onProfile(user: UserSearchItem): void {
    switch (user.context) {
      case 'staff':
        this.router.navigate(['/tenant/administration/staff-users', user.person.id]);
        break;

      case 'student':
        this.router.navigate(['/tenant/students', user.person.id]);
        break;

      case 'parent':
        this.router.navigate(['/tenant/parents', user.person.id]);
        break;
    }
  }

  protected onReset(): void {
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

  private cleanPayload(payload: {
    name: string | null;
    lastname: string | null;
    mothername: string | null;
    email: string | null;
    role_id: number | null;
  }): Partial<{
    name: string;
    lastname: string;
    mothername: string;
    email: string;
    role_id: number;
  }> {
    return Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== null && value !== ''),
    );
  }
}
