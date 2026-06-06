import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SklModalService } from '@shared/services/skl-modal-service';
import { SkSelectComponent } from '@shared/ui/sk-select/sk-select.component';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

/**
 * Generic person item used by the manage people modal.
 *
 * The modal only depends on a stable id, a display descriptor, and an optional
 * photo URL so it can be reused across different modules.
 */
export interface SklManagePeopleModalItem {
  id: number;
  descriptor: string;
  photo?: string | null;
}

/**
 * Data received by the manage people modal.
 */
export interface SklManagePeopleModalData {
  people: SklManagePeopleModalItem[];
  selectedPeople: SklManagePeopleModalItem[];
  placeholder?: string;
  emptyMessage?: string;
  selectedTitle?: string;
}

/**
 * Result returned by the manage people modal.
 */
export interface SklManagePeopleModalResult {
  confirmed: boolean;
  ids: number[];
}

/**
 * Reusable modal for managing assigned people.
 *
 * Responsibilities:
 * - Receive a full people list and the currently selected people.
 * - Allow adding people through a select + explicit add action.
 * - Allow removing assigned people by unchecking them.
 * - Return the final selected people ids to the parent screen.
 *
 * Notes:
 * - This component does not call APIs.
 * - The parent screen owns persistence and business behavior.
 */
@Component({
  selector: 'app-skl-manage-people-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SkSelectComponent, UiButtonComponent],
  templateUrl: './skl-mange-people-modal.component.html',
  styleUrl: './skl-mange-people-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SklManagePeopleModalComponent {
  private readonly modal = inject(SklModalService);

  readonly data = input<SklManagePeopleModalData | null>(null);

  protected readonly personControl = new FormControl<number | null>(null);

  protected readonly selectedPersonId = signal<number | null>(null);
  protected readonly selectedPeople = signal<SklManagePeopleModalItem[]>([]);

  protected readonly people = computed(() => this.data()?.people ?? []);

  protected readonly selectedTitle = computed(
    () => this.data()?.selectedTitle ?? 'Personas seleccionadas',
  );

  protected readonly placeholder = computed(
    () => this.data()?.placeholder ?? 'Selecciona una persona',
  );

  protected readonly emptyMessage = computed(
    () => this.data()?.emptyMessage ?? 'No hay personas seleccionadas.',
  );

  protected readonly canAddPerson = computed(() => !!this.selectedPersonId());

  protected readonly availablePeople = computed(() => {
    const selectedIds = new Set(this.selectedPeople().map((person) => person.id));

    return this.people().filter((person) => !selectedIds.has(person.id));
  });

  constructor() {
    effect(() => {
      this.selectedPeople.set(this.uniquePeople(this.data()?.selectedPeople ?? []));
      this.resetPersonControl();
    });

    this.personControl.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      this.selectedPersonId.set(value);
    });
  }

  /**
   * Adds the currently selected person to the assigned list and clears the select.
   */
  protected addSelectedPerson(): void {
    const personId = this.selectedPersonId();

    if (!personId) {
      return;
    }

    const person = this.people().find((item) => item.id === personId);

    if (!person) {
      this.resetPersonControl();
      return;
    }

    this.selectedPeople.update((current) => {
      if (current.some((item) => item.id === person.id)) {
        return current;
      }

      return [...current, person];
    });

    this.resetPersonControl();
  }

  /**
   * Removes a person from the assigned list when its checkbox is unchecked.
   */
  protected onPersonChecked(personId: number, event: Event): void {
    const checked = (event.target as HTMLInputElement | null)?.checked ?? false;

    if (checked) {
      return;
    }

    this.selectedPeople.update((current) => current.filter((person) => person.id !== personId));
  }

  /**
   * Closes the modal without returning changes.
   */
  protected onCancel(): void {
    this.modal.close<SklManagePeopleModalResult>({
      confirmed: false,
      ids: [],
    });
  }

  /**
   * Returns the final assigned people ids.
   */
  protected onSubmit(): void {
    this.modal.close<SklManagePeopleModalResult>({
      confirmed: true,
      ids: this.selectedPeople().map((person) => person.id),
    });
  }

  private resetPersonControl(): void {
    this.personControl.setValue(null);
    this.selectedPersonId.set(null);
  }

  private uniquePeople(people: SklManagePeopleModalItem[]): SklManagePeopleModalItem[] {
    const map = new Map<number, SklManagePeopleModalItem>();

    for (const person of people) {
      map.set(person.id, person);
    }

    return [...map.values()];
  }
}
