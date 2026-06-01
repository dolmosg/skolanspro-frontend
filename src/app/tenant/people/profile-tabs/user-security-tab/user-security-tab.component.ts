import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, input, OnInit, output, signal } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '../../../../shared/base/skolans-base-component';
import { ScreenOptionItem } from '../../../../shared/interfaces/configuration.interfaces';
import { SkSelectComponent } from '../../../../shared/ui/sk-select/sk-select.component';
import { UiButtonComponent } from '../../../../shared/ui/ui-button/ui-button';

interface StaffUser {
  id: number;
  email: string;
  active: boolean;
  role_id?: number | null;
  role?: {
    id: number;
    name: string;
    translation: string;
  } | null;
}

interface StaffRole {
  id: number;
  name: string;
  translation: string;
}

interface UserSecurityOptionsData {
  options?: ScreenOptionItem[];
}

@Component({
  selector: 'app-user-security-tab',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe, SkSelectComponent, UiButtonComponent],
  templateUrl: './user-security-tab.component.html',
  styleUrl: './user-security-tab.component.scss',
})
export class UserSecurityTabComponent extends SkolansBaseComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  user = input<StaffUser | null>(null);
  roles = input<StaffRole[]>([]);
  route = input<string | null>(null);

  userUpdated = output<Partial<StaffUser>>();

  protected readonly form = signal<FormGroup>(
    this.fb.group({
      email: [null, [Validators.required, Validators.email]],
      active: [true, [Validators.required]],
      role_id: [null, [Validators.required]],
    }),
  );

  protected readonly initialValues = signal<Record<string, unknown> | null>(null);
  protected readonly formVersion = signal(0);

  protected readonly hasChanges = computed(() => {
    this.formVersion();
    return this.form().dirty;
  });

  constructor() {
    super();

    this.form().valueChanges.subscribe(() => {
      this.markFormChanged();
    });

    effect(() => {
      const user = this.user();

      const values = user
        ? this.normalizeUserValues(user)
        : {
            email: null,
            active: true,
            role_id: null,
          };

      this.form().reset(values, { emitEvent: false });
      this.initialValues.set(this.form().getRawValue());
      this.form().markAsPristine();
      this.form().markAsUntouched();
      this.applyPermissions();
      this.markFormChanged();
    });
  }

  ngOnInit(): void {
    this.loadOptions();
  }

  protected loadOptions(): void {
    const route = this.route();

    if (!route) {
      this.clearScreenOptions();
      this.applyPermissions();
      this.markFormChanged();
      return;
    }

    this.executeSilentRequest(
      this.api.get<UserSecurityOptionsData>(route),
      (res) => {
        this.setScreenOptions(res.data.options);
        this.applyPermissions();
        this.markFormChanged();
      },
      () => {
        this.clearScreenOptions();
        this.applyPermissions();
        this.markFormChanged();
      },
    );
  }

  protected applyPermissions(): void {
    if (!this.hasScreenOption('update')) {
      this.form().disable({ emitEvent: false });
      return;
    }

    this.form().enable({ emitEvent: false });
  }

  protected onSave(): void {
    const route = this.route();
    const userId = this.user()?.id;

    if (!route || !userId || !this.hasScreenOption('update') || !this.hasChanges()) {
      return;
    }

    if (this.form().invalid) {
      this.form().markAllAsTouched();
      return;
    }

    this.executeMutationRequest(
      this.api.put(`${route}/${userId}`, this.form().getRawValue()),
      (res: any) => {
        const current = this.form().getRawValue();
        const roleId = current['role_id'];
        const role = this.roles().find((item) => item.id === roleId) ?? null;

        const updatedUser = res.data?.user ?? {
          ...this.user(),
          ...current,
          role,
        };

        this.initialValues.set(current);
        this.userUpdated.emit(updatedUser);

        this.form().markAsPristine();
        this.form().markAsUntouched();
        this.applyPermissions();
        this.markFormChanged();
      },
    );
  }

  protected onCancel(): void {
    const initial = this.initialValues();

    if (!initial) {
      return;
    }

    this.form().reset(initial, { emitEvent: false });
    this.form().markAsPristine();
    this.form().markAsUntouched();
    this.applyPermissions();
    this.markFormChanged();
  }

  protected onChangePassword(): void {
    // Pending dedicated change-password flow.
  }

  protected control(name: 'email' | 'active' | 'role_id'): FormControl {
    return this.form().get(name) as FormControl;
  }

  private normalizeUserValues(user: StaffUser): Record<string, unknown> {
    const roleId = user.role_id ?? user.role?.id ?? null;

    return {
      email: user.email ?? null,
      active: user.active ?? true,
      role_id: roleId !== null ? Number(roleId) : null,
    };
  }

  private markFormChanged(): void {
    this.formVersion.update((value) => value + 1);
  }
}
