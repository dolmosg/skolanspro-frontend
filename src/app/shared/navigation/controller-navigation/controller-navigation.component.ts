import { Component, OnInit, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '../../base/skolans-base-component';
import { UiIconComponent } from '../../ui/ui-icon/ui-icon';

export interface ControllerNavigationItem {
  id: number | string;
  name: string;
  translation: string;
  icon?: string | null;
  parent_id?: number | string | null;
  module_id?: number | string | null;
  color?: string | null;
  has_children?: boolean;
  route?: string | null;
  navigationRoute?: string;
  order?: number | null;
  children?: ControllerNavigationItem[];
}

@Component({
  selector: 'app-controller-navigation',
  imports: [RouterLink, TranslatePipe, UiIconComponent],
  templateUrl: './controller-navigation.component.html',
  styleUrl: './controller-navigation.component.scss',
})
export class ControllerNavigationComponent extends SkolansBaseComponent implements OnInit {
  protected readonly controllers = signal<ControllerNavigationItem[]>([]);

  protected readonly search = signal('');

  protected readonly items = computed(() => {
    const term = this.normalizeSearch(this.search());

    return [...this.controllers()]
      .map((controller) => this.normalizeController(controller))
      .filter((controller) => {
        if (!term) return true;

        const translated = this.translate.instant(controller.translation);

        return (
          this.normalizeSearch(translated).includes(term) ||
          this.normalizeSearch(controller.name).includes(term)
        );
      })
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  });

  protected onSearchChange(value: string): void {
    this.search.set(value);
  }

  private normalizeSearch(value: string | null | undefined): string {
    return (value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  ngOnInit(): void {
    this.initRouteMeta();
    this.loadControllers();
  }

  private loadControllers(): void {
    const route = this.apiRoute();

    if (!route) return;

    this.clearScreenOptions();

    this.executeSilentRequest(
      this.api.get(route),
      (res: any) => {
        this.setScreenOptions(res.data?.options);

        this.controllers.set([
          ...(res.data?.children ?? res.data?.controllers ?? res.data?.items ?? []),
        ]);
      },
      () => {
        this.controllers.set([]);
      },
    );
  }

  private normalizeController(controller: ControllerNavigationItem): ControllerNavigationItem {
    return {
      ...controller,
      navigationRoute: this.resolveNavigationRoute(controller),
    };
  }

  private resolveNavigationRoute(controller: ControllerNavigationItem): string {
    return controller.route?.trim() || controller.name;
  }
}
