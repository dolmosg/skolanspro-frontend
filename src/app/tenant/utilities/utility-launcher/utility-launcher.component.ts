import { Component, OnInit } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import {
  ISklConfirmModalData,
  SklConfirmModal,
} from '@shared/base/skl-confirm-modal/skl-confirm-modal';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';

export interface UtilityLauncherItem {
  id: number | string;
  name: string;
  translation: string;
  icon?: string | null;
  color?: string | null;
  route?: string | null;
  order?: number | null;
}

@Component({
  selector: 'app-utility-launcher',
  standalone: true,
  imports: [TranslatePipe, UiIconComponent],
  templateUrl: './utility-launcher.component.html',
  styleUrl: './utility-launcher.component.scss',
})
export class UtilityLauncherComponent extends SkolansBaseComponent implements OnInit {
  /**
   * Available utility actions for the current controller.
   */
  utilities: UtilityLauncherItem[] = [];

  ngOnInit(): void {
    this.initRouteMeta();
    this.loadUtilities();
  }

  /**
   * Loads available utility actions from backend.
   */
  private loadUtilities(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.clearScreenOptions();

    this.executeSilentRequest(this.api.get(route), (res: any) => {
      this.setScreenOptions(res.data?.options);

      this.utilities = [...(res.data?.children ?? res.data?.items ?? [])]
        .map((utility: UtilityLauncherItem) => ({
          ...utility,
        }))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    });
  }

  /**
   * Executes a utility endpoint.
   */
  protected async runUtility(utility: UtilityLauncherItem): Promise<void> {
    if (!utility.name) {
      return;
    }

    const confirmed = await this.modal.open<ISklConfirmModalData, boolean>({
      component: SklConfirmModal,
      title: this.translate.instant(utility.translation),
      data: {
        message: this.translate.instant('utilities.messages.confirm-execution'),
        confirmLabel: this.translate.instant('common.run'),
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

    const endpoint = utility.route?.trim() || `utilities/${utility.name}/execute`;

    this.executeMutationRequest(this.api.post(endpoint, {}), () => {});
  }

  /**
   * Maps backend semantic colors to utility card variants.
   */
  protected getUtilityColor(color?: string | null): string {
    return color?.trim() || 'primary';
  }
}
