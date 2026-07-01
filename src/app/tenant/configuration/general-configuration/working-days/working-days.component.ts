import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import type { ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import type { IWorkingDay } from '@shared/interfaces/configuration.interfaces';

interface WorkingDaysIndexData {
  items: IWorkingDay[];
  options?: ScreenOptionItem[];
}

interface WorkingDayMutationData {
  item: IWorkingDay;
}

@Component({
  selector: 'app-working-days',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './working-days.component.html',
  styleUrl: './working-days.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkingDaysComponent extends SkolansBaseComponent implements OnInit {
  protected readonly workingDays = signal<IWorkingDay[]>([]);
  protected readonly updatingWorkingDayId = signal<number | null>(null);

  ngOnInit(): void {
    this.initRouteMeta();
    this.loadWorkingDays();
  }

  protected loadWorkingDays(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.executeSilentRequest<WorkingDaysIndexData>(this.api.get(route), (res) => {
      this.workingDays.set(res.data.items ?? []);
      this.setScreenOptions(res.data.options);
    });
  }

  protected updateWorkingDay(item: IWorkingDay, event: Event): void {
    const input = event.target instanceof HTMLInputElement ? event.target : null;
    const route = this.apiRoute();
    const previousActive = item.active;

    if (!input) {
      return;
    }

    if (!route || !this.getScreenOption('update') || this.updatingWorkingDayId()) {
      input.checked = previousActive;
      return;
    }

    const active = input.checked;
    let updatedFromBackend = false;

    this.updatingWorkingDayId.set(item.id);

    this.executeMutationRequest<WorkingDayMutationData>(
      this.api.put<WorkingDayMutationData>(`${route}/${item.id}`, { active }),
      (res) => {
        const updatedItem = res.data.item;

        this.workingDays.update((items) =>
          items.map((current) => (current.id === updatedItem.id ? updatedItem : current)),
        );

        updatedFromBackend = true;
      },
      () => {
        if (!updatedFromBackend) {
          input.checked = previousActive;
        }

        this.updatingWorkingDayId.set(null);
      },
    );
  }
}
