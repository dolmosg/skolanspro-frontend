import { CommonModule } from '@angular/common';
import { Component, computed, effect, input, output, OnInit, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '../../../../shared/base/skolans-base-component';
import { ScreenOptionItem } from '../../../../shared/interfaces/access.interfaces';
import { UiButtonComponent } from '../../../../shared/ui/ui-button/ui-button';

interface StaffPerson {
  id: number;
  direct?: boolean | null;
  direct_type_id?: number | null;
  [key: string]: any;
}

interface DirectType {
  id: number;
  name: string;
  translation?: string | null;
  [key: string]: any;
}

interface PersonDirectCommunicationOptionsData {
  options?: ScreenOptionItem[];
}

@Component({
  selector: 'app-person-direct-communication-tab',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe, UiButtonComponent],
  templateUrl: './person-direct-communication-tab.component.html',
  styleUrl: './person-direct-communication-tab.component.scss',
})
export class PersonDirectCommunicationTabComponent extends SkolansBaseComponent implements OnInit {
  private readonly fb = new FormBuilder();

  person = input<StaffPerson | null>(null);
  directTypes = input<DirectType[]>([]);
  route = input<string | null>(null);
  personUpdated = output<Partial<StaffPerson>>();

  protected readonly form = signal<FormGroup>(
    this.fb.group({
      direct: [false],
      direct_type_id: [null],
    }),
  );

  protected readonly initialValues = signal<Record<string, any> | null>(null);
  protected readonly formVersion = signal(0);

  protected readonly canUpdate = computed(() => this.hasScreenOption('update'));

  protected readonly hasChanges = computed(() => {
    this.formVersion();

    const initial = this.initialValues();

    if (!initial) {
      return false;
    }

    const current = this.form().getRawValue();

    return (
      current.direct !== initial['direct'] || current.direct_type_id !== initial['direct_type_id']
    );
  });

  constructor() {
    super();

    effect(() => {
      const person = this.person();

      const values = {
        direct: !!person?.direct,
        direct_type_id: person?.direct_type_id ?? null,
      };

      this.form().reset(values, { emitEvent: false });
      this.initialValues.set(values);
      this.form().markAsPristine();
      this.form().markAsUntouched();

      this.applyPermissions();
      this.markFormChanged();
    });
  }

  ngOnInit(): void {
    this.initRouteMeta();
    this.loadOptions();
  }

  protected loadOptions(): void {
    const route = this.route();

    if (!route) {
      return;
    }

    this.executeSilentRequest(this.api.get<PersonDirectCommunicationOptionsData>(route), (res) => {
      this.setScreenOptions(res.data.options);
      this.applyPermissions();
      this.markFormChanged();
    });
  }

  protected applyPermissions(): void {
    const form = this.form();
    const directControl = this.control('direct');
    const directTypeControl = this.control('direct_type_id');

    if (!this.canUpdate()) {
      form.disable({ emitEvent: false });
      return;
    }

    directControl.enable({ emitEvent: false });

    if (directControl.value) {
      directTypeControl.enable({ emitEvent: false });
    } else {
      directTypeControl.disable({ emitEvent: false });
    }
  }

  protected onDirectChange(): void {
    if (!this.control('direct').value) {
      this.control('direct_type_id').setValue(null, { emitEvent: false });
    }

    this.applyPermissions();
    this.markFormChanged();
  }

  protected setDirectType(id: number | null): void {
    if (!this.control('direct').value || !this.canUpdate()) {
      return;
    }

    this.control('direct_type_id').setValue(id, { emitEvent: false });
    this.control('direct_type_id').markAsDirty();

    this.markFormChanged();
  }

  protected onSave(): void {
    const route = this.route();
    const personId = this.person()?.id;

    if (!route || !personId || !this.canUpdate() || !this.hasChanges()) {
      return;
    }

    this.executeMutationRequest(
      this.api.put(`${route}/${personId}`, this.form().getRawValue()),
      () => {
        const current = this.form().getRawValue();

        this.initialValues.set(current);
        this.personUpdated.emit(current);

        this.form().markAsPristine();
        this.form().markAsUntouched();

        this.applyPermissions();
        this.markFormChanged();
      },
    );
  }

  private markFormChanged(): void {
    this.formVersion.update((value) => value + 1);
  }

  protected control(name: 'direct' | 'direct_type_id'): FormControl {
    return this.form().get(name) as FormControl;
  }
}
