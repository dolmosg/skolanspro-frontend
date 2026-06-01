import { CommonModule } from '@angular/common';
import { Component, computed, input, output, OnInit, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '../../../../shared/base/skolans-base-component';
import { ScreenOptionItem } from '../../../../shared/interfaces/configuration.interfaces';
import { UiButtonComponent } from '../../../../shared/ui/ui-button/ui-button';

interface StaffUser {
  id: number;
  role_id?: number | null;
  role?: {
    id: number;
    name: string;
    translation?: string | null;
  } | null;
  [key: string]: any;
}

interface Role {
  id: number;
  name: string;
  translation?: string | null;
  [key: string]: any;
}

interface UserRolesOptionsData {
  options?: ScreenOptionItem[];
}

@Component({
  selector: 'app-user-roles-tab',
  standalone: true,
  imports: [CommonModule, TranslatePipe, UiButtonComponent],
  templateUrl: './user-roles-tab.component.html',
  styleUrl: './user-roles-tab.component.scss',
})
export class UserRolesTabComponent extends SkolansBaseComponent implements OnInit {
  user = input<StaffUser | null>(null);
  roles = input<Role[]>([]);
  assignments = input<Role[]>([]);
  route = input<string | null>(null);
  assignmentsUpdated = output<{ roles: Role[] }>();

  protected readonly selectedRoleIds = signal<number[]>([]);
  protected readonly initialRoleIds = signal<number[]>([]);
  private primaryRoleId(): number | null {
    return this.user()?.role_id ?? this.user()?.role?.id ?? null;
  }

  protected readonly canUpdate = computed(() => this.hasScreenOption('update'));

  protected readonly availableRoles = computed(() => {
    const primaryRoleId = this.primaryRoleId();

    return this.roles().filter((role) => role.id !== primaryRoleId);
  });

  protected readonly hasChanges = computed(() => {
    const current = [...this.selectedRoleIds()].sort();
    const initial = [...this.initialRoleIds()].sort();

    if (current.length !== initial.length) {
      return true;
    }

    return current.some((id, index) => id !== initial[index]);
  });

  ngOnInit(): void {
    this.initRouteMeta();
    this.loadOptions();
    this.syncAssignments();
  }

  protected loadOptions(): void {
    const route = this.route();

    if (!route) {
      return;
    }

    this.executeSilentRequest(this.api.get<UserRolesOptionsData>(route), (res) => {
      this.setScreenOptions(res.data.options);
    });
  }

  protected syncAssignments(): void {
    const primaryRoleId = this.primaryRoleId();

    const ids = this.assignments()
      .map((role) => role.id)
      .filter((id) => id !== primaryRoleId);

    this.selectedRoleIds.set(ids);
    this.initialRoleIds.set(ids);
  }

  protected isSelected(roleId: number): boolean {
    return this.selectedRoleIds().includes(roleId);
  }

  protected toggleRole(roleId: number, checked: boolean): void {
    if (!this.canUpdate()) {
      return;
    }

    this.selectedRoleIds.update((current) => {
      if (checked) {
        return current.includes(roleId) ? current : [...current, roleId];
      }

      return current.filter((id) => id !== roleId);
    });
  }

  protected onSave(): void {
    const route = this.route();
    const userId = this.user()?.id;

    if (!route || !userId || !this.canUpdate() || !this.hasChanges()) {
      return;
    }

    this.executeMutationRequest(
      this.api.put<{ roles: Role[] }>(`${route}/${userId}`, {
        roles: this.selectedRoleIds(),
      }),
      (res) => {
        const roles = res.data.roles ?? [];
        const primaryRoleId = this.primaryRoleId();

        const additionalRoles = roles.filter((role) => role.id !== primaryRoleId);
        const ids = additionalRoles.map((role) => role.id);

        this.selectedRoleIds.set(ids);
        this.initialRoleIds.set(ids);
        this.assignmentsUpdated.emit({ roles: additionalRoles });
      },
    );
  }
}
