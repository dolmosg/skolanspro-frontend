import { NgTemplateOutlet } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  input,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import type { ScreenChildItem } from '@shared/interfaces/access.interfaces';
import type { IRubric, IRubricSection } from '@shared/interfaces/planning.interfaces';
import { FormErrorComponent } from '@shared/ui/form-error/form-error';
import { SkSelectComponent } from '@shared/ui/sk-select/sk-select.component';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

import { RubricSkillsComponent } from '../rubric-skills/rubric-skills.component';

import type {
  RubricSectionsCatalogsDto,
  RubricSectionsIndexDto,
  RubricSectionMutationDto,
} from '../../rubrics.interfaces';

type RubricSectionEditorState =
  | { mode: 'create' }
  | { mode: 'edit'; rubricSectionId: number };
type RubricSectionMutationPayload = Pick<
  IRubricSection,
  'name' | 'description' | 'evaluator_role_id'
>;

/**
 * Read-only master-detail workspace for the sections owned by one rubric.
 *
 * The endpoint collection is canonical. Selection is local presentation state;
 * options, children, and editor catalogs are retained for later iterations
 * without interpreting Skills or initiating additional requests.
 */
@Component({
  selector: 'app-rubric-sections',
  imports: [
    FormErrorComponent,
    DragDropModule,
    NgTemplateOutlet,
    ReactiveFormsModule,
    RubricSkillsComponent,
    SkSelectComponent,
    TranslatePipe,
    UiButtonComponent,
  ],
  templateUrl: './rubric-sections.component.html',
  styleUrl: './rubric-sections.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RubricSectionsComponent extends SkolansBaseComponent implements OnInit {
  readonly rubric = input.required<IRubric>();
  readonly child = input.required<ScreenChildItem>();

  protected readonly sections = signal<IRubricSection[]>([]);
  protected readonly catalogs = signal<RubricSectionsCatalogsDto>({
    evaluator_roles: [],
    stage_subjects: [],
  });
  protected readonly selectedSection = signal<IRubricSection | null>(null);
  protected readonly loaded = signal(false);
  protected readonly editor = signal<RubricSectionEditorState | null>(null);
  protected readonly skillsChild = computed(() => this.getScreenChild('rubric-skills'));
  protected readonly sectionForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(128)],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    evaluator_role_id: new FormControl<number | null>(null, Validators.required),
  });

  ngOnInit(): void {
    this.loadSections();
  }

  protected selectSection(section: IRubricSection): void {
    this.selectedSection.set(section);
  }

  protected startCreate(): void {
    if (this.editor() !== null || this.loading()) {
      return;
    }

    this.resetSectionForm();
    this.editor.set({ mode: 'create' });
  }

  protected startEdit(section: IRubricSection): void {
    if (this.editor() !== null || this.loading()) {
      return;
    }

    this.sectionForm.reset({
      name: section.name,
      description: section.description,
      evaluator_role_id: section.evaluator_role_id,
    });
    this.editor.set({ mode: 'edit', rubricSectionId: section.id });
  }

  protected isEditingSection(rubricSectionId: number): boolean {
    const editor = this.editor();

    return editor?.mode === 'edit' && editor.rubricSectionId === rubricSectionId;
  }

  protected cancelEditor(): void {
    if (this.loading()) {
      return;
    }

    this.closeEditor();
  }

  protected saveEditor(): void {
    if (this.sectionForm.invalid) {
      this.sectionForm.markAllAsTouched();
      return;
    }

    const editor = this.editor();
    const route = this.child().route;

    if (!editor || !route || this.loading()) {
      return;
    }

    const values = this.sectionForm.getRawValue();
    const payload: RubricSectionMutationPayload = {
      name: values.name,
      description: values.description,
      evaluator_role_id: values.evaluator_role_id!,
    };
    const contextRoute = `${route}/${this.rubric().id}`;

    if (editor.mode === 'create') {
      this.executeMutationRequest<RubricSectionMutationDto>(
        this.api.post(contextRoute, payload),
        (response) => {
          this.sections.update((sections) =>
            this.sortSections([...sections, response.data.rubric_section]),
          );
          this.closeEditor();
        },
      );
      return;
    }

    this.executeMutationRequest<RubricSectionMutationDto>(
      this.api.put(`${contextRoute}/${editor.rubricSectionId}`, payload),
      (response) => {
        const updatedSection = response.data.rubric_section;

        this.sections.update((sections) =>
          this.sortSections(
            sections.map((section) =>
              section.id === updatedSection.id ? updatedSection : section,
            ),
          ),
        );
        this.selectedSection.update((selected) =>
          selected?.id === updatedSection.id ? updatedSection : selected,
        );
        this.closeEditor();
      },
    );
  }

  protected reorderSections(event: CdkDragDrop<IRubricSection[]>): void {
    const route = this.child().route;

    if (
      !route ||
      !this.getScreenOption('order') ||
      this.editor() !== null ||
      this.loading() ||
      event.previousIndex === event.currentIndex
    ) {
      return;
    }

    const reorderedSections = [...this.sections()];
    moveItemInArray(reorderedSections, event.previousIndex, event.currentIndex);

    this.executeMutationRequest<Pick<RubricSectionsIndexDto, 'rubric_sections'>>(
      this.api.put(`${route}/${this.rubric().id}/order`, {
        ids: reorderedSections.map((section) => section.id),
      }),
      (response) => {
        const selectedId = this.selectedSection()?.id;
        const sections = response.data.rubric_sections;

        this.sections.set(sections);

        if (selectedId !== undefined) {
          this.selectedSection.set(sections.find((section) => section.id === selectedId) ?? null);
        }
      },
    );
  }

  protected async deleteSection(section: IRubricSection): Promise<void> {
    if (this.loading() || this.editor() !== null) {
      return;
    }

    const route = this.child().route;

    if (!route) {
      return;
    }

    const confirmed = await this.confirmDelete(
      'planning.rubric-sections.delete',
      'planning.rubric-sections.messages.confirm-delete',
      { name: section.name },
    );

    if (!confirmed || this.loading() || this.editor() !== null) {
      return;
    }

    const selectedId = this.selectedSection()?.id;

    this.executeMutationRequest<Pick<RubricSectionsIndexDto, 'rubric_sections'>>(
      this.api.delete(`${route}/${this.rubric().id}/${section.id}`),
      (response) => {
        const sections = response.data.rubric_sections;

        this.sections.set(sections);
        this.selectedSection.set(
          selectedId === section.id
            ? (sections[0] ?? null)
            : (sections.find((item) => item.id === selectedId) ?? null),
        );
      },
    );
  }

  private loadSections(): void {
    const route = this.child().route;

    if (!route) {
      return;
    }

    this.loaded.set(false);
    this.executeSilentRequest<RubricSectionsIndexDto>(
      this.api.get(`${route}/${this.rubric().id}`),
      (response) => {
        const sections = response.data.rubric_sections;

        this.sections.set(sections);
        this.catalogs.set(response.data.catalogs);
        this.selectedSection.set(sections[0] ?? null);
        this.setScreenOptions(response.data.options);
        this.setScreenChildren(response.data.children);
        this.loaded.set(true);
      },
    );
  }

  private closeEditor(): void {
    this.editor.set(null);
    this.resetSectionForm();
  }

  private resetSectionForm(): void {
    this.sectionForm.reset({
      name: '',
      description: '',
      evaluator_role_id: null,
    });
  }

  private sortSections(sections: IRubricSection[]): IRubricSection[] {
    return [...sections].sort((left, right) => left.order - right.order || left.id - right.id);
  }
}
