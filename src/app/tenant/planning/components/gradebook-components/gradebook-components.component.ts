import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import type { ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import type { ISection } from '@shared/interfaces/administration.interfaces';
import type { IGradebookSectionType, ILevel } from '@shared/interfaces/configuration.interfaces';
import type { IGradebookComponent } from '@shared/interfaces/planning.interfaces';
import { SkSelectComponent } from '@shared/ui/sk-select/sk-select.component';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

interface GradebookComponentsIndexData {
  options?: ScreenOptionItem[];
  sections?: ISection[];
  levels?: ILevel[];
  'section-gradebook-types'?: IGradebookSectionType[];
}

interface GradebookComponentsData {
  'gradebook-components'?: IGradebookComponent[];
}

interface GradebookComponentMutationData {
  'gradebook-component'?: IGradebookComponent;
}

interface GradebookComponentStorePayload {
  code: string;
  description: string | null;
  page_break: boolean;
  gradebook_section_type_id: number;
  section_id: number;
  level_id: number;
}

interface GradebookComponentUpdatePayload {
  code: string;
  description: string | null;
  page_break: boolean;
  gradebook_section_type_id?: number;
}

const PAGE_BREAK_OPTIONS = [
  { value: false, translation: 'common.no' },
  { value: true, translation: 'common.yes' },
];

@Component({
  selector: 'app-gradebook-components',
  imports: [ReactiveFormsModule, SkSelectComponent, UiButtonComponent, TranslatePipe],
  templateUrl: './gradebook-components.component.html',
  styleUrl: './gradebook-components.component.scss',
})
export class GradebookComponentsComponent extends SkolansBaseComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  protected readonly sections = signal<ISection[]>([]);
  protected readonly levels = signal<ILevel[]>([]);
  protected readonly gradebookComponents = signal<IGradebookComponent[]>([]);
  protected readonly sectionGradebookTypes = signal<IGradebookSectionType[]>([]);
  protected readonly selectedSectionId = signal<number | null>(null);
  protected readonly selectedLevelId = signal<number | null>(null);
  protected readonly editingComponentId = signal<number | null>(null);
  protected readonly creatingComponent = signal(false);
  protected readonly creatingComponentRequest = signal(false);
  protected readonly updatingComponentRequest = signal(false);
  protected readonly deletingComponentId = signal<number | null>(null);

  protected readonly sectionControl = new FormControl<number | null>(null);
  protected readonly levelControl = new FormControl<number | null>(null);
  protected readonly editorCodeControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(10)],
  });
  protected readonly editorDescriptionControl = new FormControl<string | null>(null, Validators.maxLength(100));
  protected readonly editorSectionTypeControl = new FormControl<number | null>(null, Validators.required);
  protected readonly editorPageBreakControl = new FormControl(false, { nonNullable: true });
  protected readonly pageBreakOptions = PAGE_BREAK_OPTIONS;

  private readonly editorCodeValue = toSignal(this.editorCodeControl.valueChanges, {
    initialValue: this.editorCodeControl.value,
  });
  private readonly editorDescriptionValue = toSignal(this.editorDescriptionControl.valueChanges, {
    initialValue: this.editorDescriptionControl.value,
  });
  private readonly editorSectionTypeValue = toSignal(this.editorSectionTypeControl.valueChanges, {
    initialValue: this.editorSectionTypeControl.value,
  });
  private readonly editorPageBreakValue = toSignal(this.editorPageBreakControl.valueChanges, {
    initialValue: this.editorPageBreakControl.value,
  });

  protected readonly canCreateComponent = computed(() => {
    const code = this.editorCodeValue();
    const description = this.editorDescriptionValue();
    const sectionTypeId = this.editorSectionTypeValue();

    return (
      this.creatingComponent()
      && !this.creatingComponentRequest()
      && this.selectedSectionId() !== null
      && this.selectedLevelId() !== null
      && code.trim() !== ''
      && code.length <= 10
      && (description === null || description.length <= 100)
      && sectionTypeId !== null
      && this.editorCodeControl.valid
      && this.editorDescriptionControl.valid
      && this.editorSectionTypeControl.valid
      && typeof this.editorPageBreakValue() === 'boolean'
    );
  });

  protected readonly canUpdateComponent = computed(() => {
    const editingComponentId = this.editingComponentId();
    const component = this.gradebookComponents().find((item) => item.id === editingComponentId);
    const code = this.editorCodeValue();
    const description = this.editorDescriptionValue();
    const sectionTypeId = this.editorSectionTypeValue();
    const isProtected = component?.section_type?.deletable === false;

    return (
      editingComponentId !== null
      && !!component
      && !this.updatingComponentRequest()
      && code.trim() !== ''
      && code.length <= 10
      && (description === null || description.length <= 100)
      && this.editorCodeControl.valid
      && this.editorDescriptionControl.valid
      && typeof this.editorPageBreakValue() === 'boolean'
      && (isProtected || (sectionTypeId !== null && this.editorSectionTypeControl.valid))
    );
  });

  ngOnInit(): void {
    this.initRouteMeta();
    this.bindSelection();
    this.loadInitialContext();
  }

  private loadInitialContext(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.executeSilentRequest<GradebookComponentsIndexData>(this.api.get(route), (response) => {
      this.setScreenOptions(response.data?.options);
      this.sections.set(response.data?.sections ?? []);
      this.levels.set(response.data?.levels ?? []);
      this.sectionGradebookTypes.set(response.data?.['section-gradebook-types'] ?? []);
    });
  }

  /** Opens isolated editor controls without changing the source component collection. */
  protected editComponent(component: IGradebookComponent): void {
    if (this.editingComponentId() !== null || this.creatingComponent()) {
      return;
    }

    this.editorCodeControl.setValue(component.code);
    this.editorDescriptionControl.setValue(component.description);
    this.editorSectionTypeControl.setValue(component.gradebook_section_type_id);
    this.editorPageBreakControl.setValue(component.page_break);
    this.sectionControl.disable({ emitEvent: false });
    this.levelControl.disable({ emitEvent: false });
    this.editingComponentId.set(component.id);
  }

  /** Opens isolated controls for a new component in the currently selected context. */
  protected addComponent(): void {
    if (
      this.editingComponentId() !== null
      || this.creatingComponent()
      || this.selectedSectionId() === null
      || this.selectedLevelId() === null
    ) {
      return;
    }

    this.resetEditorControls();
    this.sectionControl.disable({ emitEvent: false });
    this.levelControl.disable({ emitEvent: false });
    this.creatingComponent.set(true);
  }

  /** Closes the visual editor and restores the selection controls without persisting data. */
  protected cancelComponentEdit(): void {
    if (this.creatingComponentRequest() || this.updatingComponentRequest()) {
      return;
    }

    this.editingComponentId.set(null);
    this.creatingComponent.set(false);
    this.sectionControl.enable({ emitEvent: false });
    this.levelControl.enable({ emitEvent: false });
  }

  protected saveNewComponent(): void {
    const route = this.apiRoute();
    const sectionId = this.selectedSectionId();
    const levelId = this.selectedLevelId();
    const gradebookSectionTypeId = this.editorSectionTypeControl.value;

    if (
      !this.canCreateComponent()
      || !route
      || sectionId === null
      || levelId === null
      || gradebookSectionTypeId === null
    ) {
      return;
    }

    const payload: GradebookComponentStorePayload = {
      code: this.editorCodeControl.value.trim(),
      description: this.editorDescriptionControl.value?.trim() || null,
      page_break: this.editorPageBreakControl.value,
      gradebook_section_type_id: gradebookSectionTypeId,
      section_id: sectionId,
      level_id: levelId,
    };

    this.creatingComponentRequest.set(true);
    this.executeMutationRequest(
      this.api.post<GradebookComponentMutationData>(route, payload),
      (response) => {
        const createdComponent = response.data?.['gradebook-component'];

        if (!createdComponent) {
          return;
        }

        this.gradebookComponents.update((components) => [...components, createdComponent]);
        this.resetEditorControls();
        this.creatingComponent.set(false);
        this.sectionControl.enable({ emitEvent: false });
        this.levelControl.enable({ emitEvent: false });
      },
      () => this.creatingComponentRequest.set(false),
    );
  }

  protected saveComponentEdit(): void {
    const route = this.apiRoute();
    const editingComponentId = this.editingComponentId();
    const component = this.gradebookComponents().find((item) => item.id === editingComponentId);

    if (!this.canUpdateComponent() || !route || !component) {
      return;
    }

    const payload: GradebookComponentUpdatePayload = {
      code: this.editorCodeControl.value.trim(),
      description: this.editorDescriptionControl.value?.trim() || null,
      page_break: this.editorPageBreakControl.value,
    };

    if (component.section_type?.deletable !== false) {
      const gradebookSectionTypeId = this.editorSectionTypeControl.value;

      if (gradebookSectionTypeId === null) {
        return;
      }

      payload.gradebook_section_type_id = gradebookSectionTypeId;
    }

    this.updatingComponentRequest.set(true);
    this.executeMutationRequest(
      this.api.put<GradebookComponentMutationData>(`${route}/${component.id}`, payload),
      (response) => {
        const updatedComponent = response.data?.['gradebook-component'];

        if (!updatedComponent) {
          return;
        }

        this.gradebookComponents.update((components) =>
          components.map((item) => (item.id === updatedComponent.id ? updatedComponent : item)),
        );
        this.resetEditorControls();
        this.editingComponentId.set(null);
        this.sectionControl.enable({ emitEvent: false });
        this.levelControl.enable({ emitEvent: false });
      },
      () => this.updatingComponentRequest.set(false),
    );
  }

  protected async deleteComponent(component: IGradebookComponent): Promise<void> {
    if (component.section_type?.deletable !== true || this.deletingComponentId() !== null) {
      return;
    }

    const confirmed = await this.confirmDelete(
      'planning.gradebook-components.delete',
      'planning.gradebook-components.messages.confirm-delete',
      {
        name: component.description ? `${component.code} - ${component.description}` : component.code,
      },
    );
    const route = this.apiRoute();

    if (
      !confirmed
      || !route
      || component.section_type?.deletable !== true
      || this.deletingComponentId() !== null
    ) {
      return;
    }

    this.deletingComponentId.set(component.id);
    this.executeMutationRequest(
      this.api.delete(`${route}/${component.id}`),
      () => {
        this.gradebookComponents.update((components) =>
          components.filter((item) => item.id !== component.id),
        );
      },
      () => this.deletingComponentId.set(null),
    );
  }

  private bindSelection(): void {
    this.sectionControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((sectionId) => {
        this.selectedSectionId.set(sectionId);
        this.loadGradebookComponents();
      });

    this.levelControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((levelId) => {
        this.selectedLevelId.set(levelId);
        this.loadGradebookComponents();
      });
  }

  private loadGradebookComponents(): void {
    const sectionId = this.selectedSectionId();
    const levelId = this.selectedLevelId();
    const route = this.apiRoute();

    if (sectionId === null || levelId === null || !route) {
      this.gradebookComponents.set([]);
      return;
    }

    this.executeSilentRequest<GradebookComponentsData>(
      this.api.get(`${route}/${sectionId}/${levelId}`),
      (response) => {
        this.gradebookComponents.set(response.data?.['gradebook-components'] ?? []);
      },
    );
  }

  private resetEditorControls(): void {
    this.editorCodeControl.setValue('');
    this.editorDescriptionControl.setValue(null);
    this.editorSectionTypeControl.setValue(null);
    this.editorPageBreakControl.setValue(false);
  }
}
