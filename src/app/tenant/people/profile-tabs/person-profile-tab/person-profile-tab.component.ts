import { CommonModule } from '@angular/common';
import { Component, effect, input, output, OnInit, signal } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { UiButtonComponent } from '../../../../shared/ui/ui-button/ui-button';
import { SkSelectComponent } from '../../../../shared/ui/sk-select/sk-select.component';
import { SkolansBaseComponent } from '../../../../shared/base/skolans-base-component';
import { ScreenOptionItem } from '../../../../shared/interfaces/access.interfaces';
import { SkTextCaseDirective } from '@shared/directives/sk-text-mode-case';
import { NameCasingMode } from '@shared/interfaces/central.interfaces';

/**
 * Staff person payload received from the parent staff profile screen.
 *
 * The structure is intentionally flexible because visible fields are dynamic
 * and depend on the `person_fields` configuration returned by the backend.
 */
interface StaffPerson {
  [key: string]: any;
}

/**
 * Dynamic field definition used to build the personal profile form.
 */
interface PersonField {
  id: number;
  name: string;
  translation: string;
  required: boolean;
  visible: boolean;
}

/**
 * Catalogs required by select fields in the personal profile form.
 */
interface PersonProfileCatalogs {
  genders: any[];
  marital_statuses: any[];
  blood_types: any[];
  direct_types: any[];
}

/**
 * Options payload returned by the child controller route.
 *
 * These options control visible actions such as update and reset.
 */
interface PersonProfileOptionsData {
  options?: ScreenOptionItem[];
}

/**
 * Embedded child component for the staff personal profile tab.
 *
 * This component does not use the parent staff route for actions.
 * It receives its own child controller route from StaffProfileComponent:
 *
 * Parent route:
 * administration/staff/{personId}
 *
 * Child route:
 * administration/person-profile
 */
@Component({
  selector: 'app-person-profile-tab',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
    UiButtonComponent,
    SkSelectComponent,
    SkTextCaseDirective,
  ],
  templateUrl: './person-profile-tab.component.html',
  styleUrl: './person-profile-tab.component.scss',
})
export class PersonProfileTabComponent extends SkolansBaseComponent implements OnInit {
  private readonly fb = new FormBuilder();

  /**
   * Dynamic fields configured by backend for the staff profile context.
   */
  fields = input<PersonField[]>([]);

  /**
   * Current staff person data loaded by the parent screen.
   */
  person = input<StaffPerson | null>(null);

  context = input<'staff' | 'parent' | 'student'>('staff');

  /**
   * Catalogs used by select controls.
   */
  catalogs = input<PersonProfileCatalogs | null>(null);

  /**
   * Child controller route.
   *
   * Expected example:
   * administration/person-profile
   */
  route = input<string | null>(null);

  /**
   * Reserved for compatibility with previous parent-save flow.
   *
   * The current implementation saves through `route()/{personId}`.
   */
  saveRoute = input<string | null>(null);

  personUpdated = output<Partial<StaffPerson>>();

  /**
   * Dynamic reactive form generated from visible fields.
   */
  protected readonly form = signal<FormGroup>(this.fb.group({}));

  /**
   * Snapshot of the original form values received from the backend.
   *
   * Used by onCancel() to restore the form without making another API request.
   */
  protected readonly initialValues = signal<Record<string, any> | null>(null);

  ngOnInit(): void {
    this.initRouteMeta();
    this.loadOptions();
  }

  /**
   * Loads child controller options.
   *
   * These options are resolved against the person-profile controller,
   * not against the parent staff controller.
   */
  protected loadOptions(): void {
    const route = this.route();

    if (!route) {
      return;
    }

    this.executeSilentRequest(this.api.get<PersonProfileOptionsData>(route), (res) => {
      this.setScreenOptions(res.data.options);
      this.applyPermissions();
    });
  }

  /**
   * Applies permissions to the form based on backend options.
   *
   * If the user does not have the `update` action, the entire form becomes
   * read-only. This keeps the UI aligned with backend permissions.
   */
  protected applyPermissions(): void {
    if (!this.hasScreenOption('update')) {
      this.form().disable();
    } else {
      this.form().enable();
    }
  }

  constructor() {
    super();

    /**
     * Rebuilds the form whenever the person or dynamic field definitions change.
     */
    effect(() => {
      const person = this.person();
      const fields = this.fields();

      if (!person || !fields.length) {
        this.form.set(this.fb.group({}));
        this.initialValues.set(null);
        return;
      }

      const group: Record<string, any> = {};

      fields.forEach((field) => {
        if (!field.visible) {
          return;
        }

        const value = this.normalizeFieldValue(field, person[field.name]);

        group[field.name] = [value, field.required ? [Validators.required] : []];
      });

      this.form.set(this.fb.group(group));
      this.initialValues.set(this.form().getRawValue());
      this.applyPermissions();
    });
  }

  /**
   * Determines the UI control type for a dynamic field.
   */
  protected getFieldType(field: PersonField): 'text' | 'select' | 'date' {
    const selectFields = ['gender_id', 'marital_status_id', 'blood_type_id', 'direct_type_id'];

    if (selectFields.includes(field.name)) {
      return 'select';
    }

    if (field.name.includes('date')) {
      return 'date';
    }

    return 'text';
  }

  /**
   * Resolves the catalog used by a select field.
   */
  protected getCatalog(field: PersonField): any[] {
    const catalogs = this.catalogs();

    if (!catalogs) {
      return [];
    }

    switch (field.name) {
      case 'gender_id':
        return catalogs.genders;
      case 'marital_status_id':
        return catalogs.marital_statuses;
      case 'blood_type_id':
        return catalogs.blood_types.map((type) => ({
          ...type,
          translation: type.translation ?? type.name,
        }));
      case 'direct_type_id':
        return catalogs.direct_types;
      default:
        return [];
    }
  }

  /**
   * Saves the personal profile data through the child controller route.
   */
  protected onSave(): void {
    const route = this.route();
    const personId = this.person()?.['id'];

    if (!route || !personId) {
      return;
    }

    if (this.form().invalid) {
      this.form().markAllAsTouched();
      return;
    }

    const payload = {
      ...this.form().getRawValue(),
      context: this.context(),
    };

    this.executeMutationRequest(this.api.put(`${route}/${personId}`, payload), (res: any) => {
      const current = this.form().getRawValue();

      const updatedPerson = res.data?.person ?? {
        ...this.person(),
        ...current,
      };

      this.initialValues.set(current);
      this.personUpdated.emit(updatedPerson);

      this.form().markAsPristine();
      this.form().markAsUntouched();
    });
  }

  /**
   * Restores the form to the original values received from the backend.
   *
   * This does not reload the API. It only resets the current form state,
   * marks it as clean, and reapplies permissions so read-only users remain
   * with the form disabled.
   */
  protected onCancel(): void {
    const initial = this.initialValues();

    if (!initial) {
      return;
    }

    this.form().reset(initial);
    this.form().markAsPristine();
    this.form().markAsUntouched();

    this.applyPermissions();
  }

  /**
   * Returns true when the dynamic form contains a control.
   */
  protected hasControl(name: string): boolean {
    return !!this.form().get(name);
  }

  /**
   * Returns a typed FormControl for template bindings.
   */
  protected control(name: string): FormControl {
    return this.form().get(name) as FormControl;
  }

  /**
   * Normalizes backend values for Angular form controls.
   *
   * Date inputs require YYYY-MM-DD, while Laravel may return ISO strings like:
   * 1967-07-29T00:00:00.000000Z
   */
  protected normalizeFieldValue(field: PersonField, value: any): any {
    if (value === undefined || value === null) {
      return null;
    }

    if (this.getFieldType(field) === 'date' && typeof value === 'string') {
      return value.split('T')[0];
    }

    return value;
  }

  protected getTextCaseMode(field: PersonField): NameCasingMode {
    const nameFields = [
      'name',
      'lastname',
      'mothername',
      'second_lastname',
      'firstname',
      'middlename',
      'paternal_lastname',
      'maternal_lastname',
    ];

    if (nameFields.includes(field.name)) {
      return this.nameCasing();
    }

    return 'normal';
  }
}
