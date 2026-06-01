import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SkolansBaseComponent } from '../../../shared/base/skolans-base-component';
import { TranslatePipe } from '@ngx-translate/core';
import { ControllerPermissions } from '../controller-permissions/controller-permissions';
import { SkSelectComponent } from '../../../shared/ui/sk-select/sk-select.component';


interface PermissionRole {
  id: number;
  name: string;
  translation: string;
}

interface PermissionModule {
  id: number;
  name: string;
  translation: string;
  assigned: boolean;
}

interface PermissionIndex {
  roles: PermissionRole[];
  modules: PermissionModule[];
}

interface PermissionControllersResponse {
  controllers: PermissionController[];
}

interface PermissionTogglePayload {
  controllerId: number;
  actionId: number;
  assigned: boolean;
}

interface PermissionAction {
  id: number;
  name: string;
  translation: string;
  assigned: boolean;
}

interface PermissionController {
  id: number;
  name: string;
  translation: string;
  assigned: boolean;
  has_children: boolean;
  has_actions: boolean;
  actions: PermissionAction[];
}

interface PermissionPathItem {
  id: number | null;
  label: string;
}

@Component({
  selector: 'app-permissions',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe, ControllerPermissions, SkSelectComponent],
  templateUrl: './permissions.html',
  styleUrl: './permissions.scss',
})
export class Permissions extends SkolansBaseComponent implements OnInit {

  public readonly loadingRoles = signal(false);
  public readonly loadingModules = signal(false);
  public readonly loadingControllers = signal(false);
  public readonly saving = signal(false);

  public readonly roles = signal<PermissionRole[]>([]);
  public readonly modules = signal<PermissionModule[]>([]);
  public readonly controllers = signal<PermissionController[]>([]);
  public readonly path = signal<PermissionPathItem[]>([]);

  public readonly roleControl = new FormControl<number | null>(null);
  public readonly moduleControl = new FormControl<number | null>(null);

  public activeParentId: number | null = null;

  public get selectedRoleId(): number | null {
    return this.roleControl.value;
  }

  public get selectedModuleId(): number | null {
    return this.moduleControl.value;
  }

  public ngOnInit(): void {
    this.initRouteMeta();
    this.loadIndex();

    this.roleControl.valueChanges.subscribe(() => this.onRoleChange());
    this.moduleControl.valueChanges.subscribe(() => this.onModuleChange());
  }

  public onRoleChange(): void {
    this.moduleControl.setValue(null, { emitEvent: false });
    this.activeParentId = null;
    this.controllers.set([]);
    this.path.set([]);

    if (!this.selectedRoleId) {
      return;
    }
  }

  public onModuleChange(): void {
    this.activeParentId = null;
    this.controllers.set([]);
    this.path.set([]);

    if (!this.selectedRoleId || !this.selectedModuleId) {
      return;
    }

    this.loadControllers();
  }

  public enterChildren(controller: PermissionController): void {
    if (!this.selectedRoleId || !this.selectedModuleId || !controller.has_children) {
      return;
    }

    this.activeParentId = controller.id;
    this.path.update((items) => [
      ...items,
      { id: controller.id, label: controller.translation || controller.name },
    ]);

    this.loadControllers();
  }

  public goToPath(index: number): void {
    const currentPath = this.path();
    const nextPath = currentPath.slice(0, index + 1);
    const target = nextPath.at(-1) ?? null;

    this.path.set(nextPath);
    this.activeParentId = target?.id ?? null;
    this.loadControllers();
  }

  public goToRootLevel(): void {
    this.activeParentId = null;
    this.path.set([]);
    this.loadControllers();
  }

  public toggleAction(payload: PermissionTogglePayload): void {
    this.controllers.update((controllers) =>
      controllers.map((item) => {
        if (item.id !== payload.controllerId) {
          return item;
        }

        const actions = item.actions.map((action) =>
          action.id === payload.actionId ? { ...action, assigned: payload.assigned } : action,
        );

        return {
          ...item,
          actions,
          assigned: actions.some((action) => action.assigned),
        };
      }),
    );
  }

  public buildActionPermissionPayload(payload: PermissionTogglePayload): {
    role_id: number;
    action_id: number;
    assigned: boolean;
  } | null {
    if (!this.selectedRoleId) {
      return null;
    }

    return {
      role_id: this.selectedRoleId,
      action_id: payload.actionId,
      assigned: payload.assigned,
    };
  }

  public updateActionPermission(payload: PermissionTogglePayload): void {
    const requestPayload = this.buildActionPermissionPayload(payload);

    if (!requestPayload) {
      return;
    }

    this.toggleAction(payload);

    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.api.put(`${route}/action-permission`, requestPayload, { loader: false }).subscribe({
      next: (res) => {
        if (this.handleApiFailure(res)) {
          this.toggleAction({
            ...payload,
            assigned: !payload.assigned,
          });
        }
      },
      error: () => {
        this.toggleAction({
          ...payload,
          assigned: !payload.assigned,
        });
        this.ignoreHandledRequestError();
      },
    });
  }

  public handleChildrenEntered(controller: PermissionController): void {
    this.enterChildren(controller);
  }


  private loadIndex(): void {
    const route = this.apiRoute();

    if (!route) {
      this.roles.set([]);
      this.modules.set([]);
      return;
    }

    this.loadingRoles.set(true);
    this.loadingModules.set(true);

    this.executeSilentRequest(this.api.get<PermissionIndex>(route), (res) => {
      this.roles.set(res.data.roles ?? []);
      this.modules.set(res.data.modules ?? []);
      this.loadingRoles.set(false);
      this.loadingModules.set(false);
    }, () => {
      this.roles.set([]);
      this.modules.set([]);
      this.loadingRoles.set(false);
      this.loadingModules.set(false);
    });
  }

  private loadControllers(): void {
    const route = this.apiRoute();

    if (!route || !this.selectedRoleId || !this.selectedModuleId) {
      this.controllers.set([]);
      return;
    }

    this.loadingControllers.set(true);

    const params = new URLSearchParams({
      role_id: String(this.selectedRoleId),
      module_id: String(this.selectedModuleId),
    });

    if (this.activeParentId) {
      params.set('parent_id', String(this.activeParentId));
    }

    this.executeSilentRequest(
      this.api.get<PermissionControllersResponse>(`${route}/controllers?${params.toString()}`),
      (res) => {
        const data = res.data ?? { controllers: [] };
        this.controllers.set(data.controllers ?? []);
        this.loadingControllers.set(false);
      },
      () => {
        this.controllers.set([]);
        this.loadingControllers.set(false);
      },
    );
  }
}
