import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { ColDef } from 'ag-grid-community';
import { BaseCrud } from '../../../shared/base/base-crud';
import { SkolansTable } from '../../../shared/ui/skolans-table/skolans-table';
import { UiButtonComponent } from '../../../shared/ui/ui-button/ui-button';
import { TranslatePipe } from '@ngx-translate/core';
import { ScreenOptionItem } from '../../../shared/interfaces/access.interfaces';


type PersonFieldContext = 'staff' | 'student' | 'parent';

interface PersonFieldItem {
  id: number;
  context: PersonFieldContext;
  name: string;
  translation: string;
  visible: boolean;
  required: boolean;
  protected: boolean;
  order: number;
}

interface PersonFieldsIndexData {
  options?: ScreenOptionItem[];
  context: PersonFieldContext;
  fields: PersonFieldItem[];
}

interface PersonFieldsUpdateData {
  context: PersonFieldContext;
  fields: PersonFieldItem[];
}

@Component({
  selector: 'app-person-fields',
  standalone: true,
  imports: [CommonModule, SkolansTable, UiButtonComponent, TranslatePipe],
  templateUrl: './person-fields.component.html',
  styleUrl: './person-fields.component.scss',
})
export class PersonFieldsComponent extends BaseCrud<PersonFieldItem> implements OnInit {
  protected readonly fields = signal<PersonFieldItem[]>([]);
  protected readonly originalFields = signal<PersonFieldItem[]>([]);
  protected readonly saving = signal(false);

  protected readonly context = computed<PersonFieldContext>(() => {
    return this.activatedRoute.snapshot.data['context'] as PersonFieldContext;
  });

  protected readonly titleKey = computed(() => {
    return `configuration.person-fields.context.${this.context()}`;
  });

  protected readonly hasChanges = computed(() => {
    return JSON.stringify(this.fields()) !== JSON.stringify(this.originalFields());
  });

  protected readonly columnDefs = computed<ColDef<PersonFieldItem>[]>(() => [
    {
      field: 'order',
      headerValueGetter: () =>  this.translate.instant('common.order'),
      width: 100,
      rowDrag: true,
      sortable: false,
      filter: false,
    },
    {
      field: 'translation',
      headerValueGetter: () =>  this.translate.instant('configuration.person-fields.fields.field'),
      flex: 1,
      minWidth: 220,
      valueGetter: (params) => {
        const key = params.data?.translation;
        return key ? this.translate.instant(key) : '';
      },
    },
    {
      field: 'visible',
      headerValueGetter: () =>  this.translate.instant('configuration.person-fields.fields.visible'),
      width: 140,
      cellRenderer: (params: any) => this.booleanRenderer(params, 'visible'),
      sortable: false,
      filter: false,
    },
    {
      field: 'required',
      headerValueGetter: () =>  this.translate.instant('configuration.person-fields.fields.required'),
      width: 150,
      cellRenderer: (params: any) => this.booleanRenderer(params, 'required'),
      sortable: false,
      filter: false,
    },
    {
      field: 'protected',
      headerValueGetter: () =>  this.translate.instant('configuration.person-fields.fields.protected'),
      width: 140,
      valueGetter: (params) =>
        params.data?.protected
          ? this.translate.instant('common.yes')
          : this.translate.instant('common.no'),
    },
  ]);

  ngOnInit(): void {
    this.initRouteMeta();
    this.loadFields();
  }

  protected loadFields(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.executeSilentRequest(this.api.get<PersonFieldsIndexData>(route), (res) => {
      this.setScreenOptions(res.data?.options);
      const fields = this.sortByOrder(res.data.fields ?? []);
      this.fields.set(fields);
      this.originalFields.set(structuredClone(fields));
    });
  }

  protected onRowOrderChange(rows: unknown[]): void {
    const ordered = this.normalizeOrder(rows as PersonFieldItem[]);
    this.fields.set(ordered);
  }

  protected onSave(): void {
    const route = this.apiRoute();

    if (!route || !this.hasChanges() || this.saving()) {
      return;
    }

    const payload = {
      fields: this.fields().map((field, index) => ({
        id: field.id,
        visible: field.visible,
        required: field.required,
        order: index + 1,
      })),
    };

    this.saving.set(true);

    this.executeMutationRequest(this.api.put<PersonFieldsUpdateData>(route, payload), (res) => {
      const fields = this.sortByOrder(res.data.fields ?? []);
      this.fields.set(fields);
      this.originalFields.set(structuredClone(fields));
      this.saving.set(false);
    });
  }

  protected onReset(): void {
    this.fields.set(structuredClone(this.originalFields()));
  }

  private updateField(id: number, changes: Partial<PersonFieldItem>): void {
    this.fields.update((current) =>
      current.map((field) => {
        if (field.id !== id) {
          return field;
        }

        const updated: PersonFieldItem = {
          ...field,
          ...changes,
        };

        if (updated.protected) {
          updated.visible = true;
          updated.required = true;
        }

        if (!updated.visible) {
          updated.required = false;
        }

        return updated;
      }),
    );
  }

  private booleanRenderer(params: any, property: 'visible' | 'required'): HTMLElement {
    const field = params.data as PersonFieldItem;
    const input = document.createElement('input');

    input.type = 'checkbox';
    input.checked = !!field[property];

    const disabled = field.protected || (property === 'required' && !field.visible);

    input.disabled = disabled;

    input.addEventListener('change', () => {
      this.updateField(field.id, {
        [property]: input.checked,
      });
    });

    return input;
  }
}
