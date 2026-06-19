import { CommonModule } from '@angular/common';
import { Component, computed, input, output, OnInit, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '../../../../shared/base/skolans-base-component';
import { ScreenOptionItem } from '../../../../shared/interfaces/access.interfaces';
import { UiButtonComponent } from '../../../../shared/ui/ui-button/ui-button';

interface StaffPerson {
  id: number;
  [key: string]: any;
}

interface Section {
  id: number;
  name: string;
  translation?: string | null;
  description?: string | null;
  [key: string]: any;
}

interface PersonSectionsOptionsData {
  options?: ScreenOptionItem[];
}

@Component({
  selector: 'app-person-sections-tab',
  standalone: true,
  imports: [CommonModule, TranslatePipe, UiButtonComponent],
  templateUrl: './person-sections-tab.component.html',
  styleUrl: './person-sections-tab.component.scss',
})
export class PersonSectionsTabComponent extends SkolansBaseComponent implements OnInit {
  person = input<StaffPerson | null>(null);
  sections = input<Section[]>([]);
  assignments = input<Section[]>([]);
  route = input<string | null>(null);

  assignmentsUpdated = output<{ sections: Section[] }>();

  protected readonly selectedSectionIds = signal<number[]>([]);
  protected readonly initialSectionIds = signal<number[]>([]);

  protected readonly canUpdate = computed(() => this.hasScreenOption('update'));

  protected readonly hasChanges = computed(() => {
    const current = [...this.selectedSectionIds()].sort((a, b) => a - b);
    const initial = [...this.initialSectionIds()].sort((a, b) => a - b);

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

    this.executeSilentRequest(this.api.get<PersonSectionsOptionsData>(route), (res) => {
      this.setScreenOptions(res.data.options);
    });
  }

  protected syncAssignments(): void {
    const ids = this.assignments().map((section) => section.id);

    this.selectedSectionIds.set(ids);
    this.initialSectionIds.set(ids);
  }

  protected isSelected(sectionId: number): boolean {
    return this.selectedSectionIds().includes(sectionId);
  }

  protected toggleSection(sectionId: number, checked: boolean): void {
    if (!this.canUpdate()) {
      return;
    }

    this.selectedSectionIds.update((current) => {
      if (checked) {
        return current.includes(sectionId) ? current : [...current, sectionId];
      }

      return current.filter((id) => id !== sectionId);
    });
  }

  protected onSave(): void {
    const route = this.route();
    const personId = this.person()?.id;

    if (!route || !personId || !this.canUpdate() || !this.hasChanges()) {
      return;
    }

    const saveRoute = `${route}/${personId}`;

    this.executeMutationRequest(
      this.api.put<{ sections: Section[] }>(saveRoute, {
        sections: this.selectedSectionIds(),
      }),
      (res) => {
        const sections = res.data.sections ?? [];
        const ids = sections.map((section) => section.id);

        this.selectedSectionIds.set(ids);
        this.initialSectionIds.set(ids);
        this.assignmentsUpdated.emit({ sections });
      },
    );
  }
}