import { CommonModule } from '@angular/common';
import { Component, computed, input, output, OnInit, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '../../../../shared/base/skolans-base-component';
import { ScreenOptionItem } from '../../../../shared/interfaces/configuration.interfaces';
import { UiButtonComponent } from '../../../../shared/ui/ui-button/ui-button';

interface StaffPerson {
  id: number;
  [key: string]: any;
}

interface Level {
  id: number;
  name: string;
  translation?: string | null;
  description?: string | null;
  [key: string]: any;
}

interface PersonLevelsOptionsData {
  options?: ScreenOptionItem[];
}

@Component({
  selector: 'app-person-levels-tab',
  standalone: true,
  imports: [CommonModule, TranslatePipe, UiButtonComponent],
  templateUrl: './person-levels-tab.component.html',
  styleUrl: './person-levels-tab.component.scss',
})
export class PersonLevelsTabComponent extends SkolansBaseComponent implements OnInit {
  person = input<StaffPerson | null>(null);
  levels = input<Level[]>([]);
  assignments = input<Level[]>([]);
  route = input<string | null>(null);
  assignmentsUpdated = output<{ levels: Level[] }>();

  protected readonly selectedLevelIds = signal<number[]>([]);
  protected readonly canUpdate = computed(() => this.hasScreenOption('update'));
  protected readonly initialLevelIds = signal<number[]>([]);

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

    this.executeSilentRequest(this.api.get<PersonLevelsOptionsData>(route), (res) => {
      this.setScreenOptions(res.data.options);
    });
  }

  protected syncAssignments(): void {
    const ids = this.assignments().map((level) => level.id);

    this.selectedLevelIds.set(ids);
    this.initialLevelIds.set(ids);
  }

  protected readonly hasChanges = computed(() => {
    const current = [...this.selectedLevelIds()].sort();
    const initial = [...this.initialLevelIds()].sort();

    if (current.length !== initial.length) {
      return true;
    }

    return current.some((id, index) => id !== initial[index]);
  });

  protected isSelected(levelId: number): boolean {
    return this.selectedLevelIds().includes(levelId);
  }

  protected toggleLevel(levelId: number, checked: boolean): void {
    if (!this.canUpdate()) {
      return;
    }

    this.selectedLevelIds.update((current) => {
      if (checked) {
        return current.includes(levelId) ? current : [...current, levelId];
      }

      return current.filter((id) => id !== levelId);
    });
  }

  protected onSave(): void {
    const route = this.route();
    const personId = this.person()?.id;

    if (!route || !personId || !this.canUpdate()) {
      return;
    }

    this.executeMutationRequest(
  this.api.put<{ levels: Level[] }>(`${route}/${personId}`, {
    levels: this.selectedLevelIds(),
  }),
  (res) => {
    const levels = res.data.levels ?? [];
    const ids = levels.map((level) => level.id);

    this.selectedLevelIds.set(ids);
    this.initialLevelIds.set(ids);
    this.assignmentsUpdated.emit({ levels });
  },
);
  }
}
