import { NgTemplateOutlet } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, effect, input, signal, untracked } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import type { ScreenChildItem } from '@shared/interfaces/access.interfaces';
import type { IRubricSection, IRubricSkill } from '@shared/interfaces/planning.interfaces';
import { FormErrorComponent } from '@shared/ui/form-error/form-error';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

import type { RubricSkillMutationDto, RubricSkillsIndexDto } from '../../rubrics.interfaces';

type RubricSkillEditorState =
  | { mode: 'create' }
  | { mode: 'edit'; rubricSkillId: number };
type RubricSkillMutationPayload = Pick<IRubricSkill, 'name' | 'description' | 'subtitle'>;

/**
 * Displays the canonical Skill structure for one RubricSection.
 *
 * The parent supplies the selected Section and authorized child metadata. This
 * component owns the child request lifecycle, child options, inline editor,
 * and canonical collection; stale responses from a previous Section are ignored.
 */
@Component({
  selector: 'app-rubric-skills',
  imports: [
    DragDropModule,
    FormErrorComponent,
    NgTemplateOutlet,
    ReactiveFormsModule,
    TranslatePipe,
    UiButtonComponent,
  ],
  templateUrl: './rubric-skills.component.html',
  styleUrl: './rubric-skills.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RubricSkillsComponent extends SkolansBaseComponent {
  readonly section = input.required<IRubricSection>();
  readonly child = input.required<ScreenChildItem>();

  protected readonly skills = signal<IRubricSkill[]>([]);
  protected readonly loaded = signal(false);
  protected readonly editor = signal<RubricSkillEditorState | null>(null);
  protected readonly skillForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    subtitle: new FormControl(false, { nonNullable: true }),
  });

  private contextKey: string | null = null;
  private requestToken = 0;

  constructor() {
    super();

    effect(() => {
      const sectionId = this.section().id;
      const route = this.child().route;

      untracked(() => this.loadSkills(sectionId, route));
    });
  }

  protected startCreate(): void {
    if (this.editor() !== null || this.loading()) {
      return;
    }

    this.resetSkillForm();
    this.editor.set({ mode: 'create' });
  }

  protected startEdit(skill: IRubricSkill): void {
    if (this.editor() !== null || this.loading()) {
      return;
    }

    this.skillForm.reset({
      name: skill.name,
      description: skill.description,
      subtitle: skill.subtitle,
    });
    this.editor.set({ mode: 'edit', rubricSkillId: skill.id });
  }

  protected isEditingSkill(rubricSkillId: number): boolean {
    const editor = this.editor();

    return editor?.mode === 'edit' && editor.rubricSkillId === rubricSkillId;
  }

  protected cancelEditor(): void {
    if (this.loading()) {
      return;
    }

    this.closeEditor();
  }

  protected saveEditor(): void {
    if (this.skillForm.invalid) {
      this.skillForm.markAllAsTouched();
      return;
    }

    const editor = this.editor();
    const route = this.child().route;

    if (!editor || !route || this.loading()) {
      return;
    }

    const sectionId = this.section().id;
    const values = this.skillForm.getRawValue();
    const payload: RubricSkillMutationPayload = {
      name: values.name,
      description: values.description,
      subtitle: values.subtitle,
    };
    const contextRoute = `${route}/${sectionId}`;

    if (editor.mode === 'create') {
      this.executeMutationRequest<RubricSkillMutationDto>(
        this.api.post(contextRoute, payload),
        (response) => {
          if (this.section().id !== sectionId) {
            return;
          }

          this.skills.update((skills) =>
            this.sortSkills([...skills, response.data.rubric_skill]),
          );
          this.closeEditor();
        },
      );
      return;
    }

    this.executeMutationRequest<RubricSkillMutationDto>(
      this.api.put(`${contextRoute}/${editor.rubricSkillId}`, payload),
      (response) => {
        if (this.section().id !== sectionId) {
          return;
        }

        const updatedSkill = response.data.rubric_skill;

        this.skills.update((skills) =>
          this.sortSkills(
            skills.map((skill) => (skill.id === updatedSkill.id ? updatedSkill : skill)),
          ),
        );
        this.closeEditor();
      },
    );
  }

  protected reorderSkills(event: CdkDragDrop<IRubricSkill[]>): void {
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

    const sectionId = this.section().id;
    const reorderedSkills = [...this.skills()];
    moveItemInArray(reorderedSkills, event.previousIndex, event.currentIndex);

    this.executeMutationRequest<Pick<RubricSkillsIndexDto, 'rubric_skills'>>(
      this.api.put(`${route}/${sectionId}/order`, {
        ids: reorderedSkills.map((skill) => skill.id),
      }),
      (response) => {
        if (this.section().id !== sectionId) {
          return;
        }

        this.skills.set(response.data.rubric_skills);
      },
    );
  }

  protected async deleteSkill(skill: IRubricSkill): Promise<void> {
    if (this.loading() || this.editor() !== null) {
      return;
    }

    const route = this.child().route;

    if (!route) {
      return;
    }

    const sectionId = this.section().id;
    const confirmed = await this.confirmDelete(
      'planning.rubric-skills.delete',
      'planning.rubric-skills.messages.confirm-delete',
      { name: skill.name },
    );

    if (!confirmed || this.loading() || this.editor() !== null) {
      return;
    }

    this.executeMutationRequest<Pick<RubricSkillsIndexDto, 'rubric_skills'>>(
      this.api.delete(`${route}/${sectionId}/${skill.id}`),
      (response) => {
        if (this.section().id !== sectionId) {
          return;
        }

        this.skills.set(response.data.rubric_skills);
      },
    );
  }

  private loadSkills(sectionId: number, route: string | undefined): void {
    const contextKey = route ? `${route}/${sectionId}` : null;

    if (!contextKey || contextKey === this.contextKey) {
      return;
    }

    this.contextKey = contextKey;
    const requestToken = ++this.requestToken;

    this.closeEditor();
    this.skills.set([]);
    this.clearScreenOptions();
    this.loaded.set(false);

    this.executeSilentRequest<RubricSkillsIndexDto>(
      this.api.get(contextKey),
      (response) => {
        if (requestToken !== this.requestToken || this.section().id !== sectionId) {
          return;
        }

        this.skills.set(response.data.rubric_skills);
        this.setScreenOptions(response.data.options);
        this.loaded.set(true);
      },
      undefined,
      () => {
        if (requestToken === this.requestToken && this.section().id === sectionId) {
          this.loaded.set(true);
        }
      },
    );
  }

  private closeEditor(): void {
    this.editor.set(null);
    this.resetSkillForm();
  }

  private resetSkillForm(): void {
    this.skillForm.reset({
      name: '',
      description: '',
      subtitle: false,
    });
  }

  private sortSkills(skills: IRubricSkill[]): IRubricSkill[] {
    return [...skills].sort((left, right) => left.order - right.order || left.id - right.id);
  }
}
