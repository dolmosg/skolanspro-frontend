import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

interface ControllerPermissionAction {
  id: number;
  name: string;
  translation: string;
  assigned: boolean;
}

interface ControllerPermissionItem {
  id: number;
  name: string;
  translation: string;
  assigned: boolean;
  has_children: boolean;
  has_actions: boolean;
  actions: ControllerPermissionAction[];
}

interface ControllerPermissionTogglePayload {
  controllerId: number;
  actionId: number;
  assigned: boolean;
}

@Component({
  selector: 'app-controller-permissions',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './controller-permissions.html',
  styleUrl: './controller-permissions.scss',
})
export class ControllerPermissions {
  @Input({ required: true }) controller!: ControllerPermissionItem;

  @Output() actionToggled = new EventEmitter<ControllerPermissionTogglePayload>();
  @Output() childrenEntered = new EventEmitter<ControllerPermissionItem>();

  onToggleAction(actionId: number): void {
    const action = this.controller.actions.find((item) => item.id === actionId);

    if (!action) {
      return;
    }

    this.actionToggled.emit({
      controllerId: this.controller.id,
      actionId,
      assigned: !action.assigned,
    });
  }

  onEnterChildren(): void {
    this.childrenEntered.emit(this.controller);
  }
}
