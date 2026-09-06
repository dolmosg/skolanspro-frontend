import { Component, computed, effect, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import type { ScreenChildItem, ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import type { ILanguage } from '@shared/interfaces/configuration.interfaces';
import type {
  IStudyPlan,
  IStudyPlanComment,
  IStudyPlanCommentGrade,
  IStudyPlanCommentType,
} from '@shared/interfaces/study-plan-interfaces';
import { FormErrorComponent } from '@shared/ui/form-error/form-error';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';

interface StudyPlanCommentTypesPayload {
  options: ScreenOptionItem[];
  children: ScreenChildItem[];
  languages: ILanguage[];
  types: IStudyPlanCommentType[];
}

interface StudyPlanCommentTypeMutationPayload {
  type: IStudyPlanCommentType;
}

interface StudyPlanTypeCommentsPayload {
  options: ScreenOptionItem[];
  grades: IStudyPlanCommentGrade[];
  comments: IStudyPlanComment[];
}

interface StudyPlanCommentMutationPayload {
  comment: IStudyPlanComment;
}

interface StudyPlanCommentListItem {
  comment: IStudyPlanComment;
  position: number;
}

@Component({
  selector: 'app-study-plan-comments-view',
  imports: [FormErrorComponent, ReactiveFormsModule, TranslatePipe, UiButtonComponent, UiIconComponent],
  templateUrl: './study-plan-comments-view.component.html',
  styleUrl: './study-plan-comments-view.component.scss',
})
export class StudyPlanCommentsViewComponent extends SkolansBaseComponent {
  readonly controller = input.required<ScreenChildItem>();
  readonly studyPlan = input.required<IStudyPlan>();
  readonly close = output<void>();

  /**
   * State ownership
   * ---------------
   * This view owns the fetched type list, its selected type, and the comments
   * belonging to that selection. Type and comment actions remain separate
   * backend-provided option collections because they belong to distinct
   * controllers in the nested comments workspace.
   */
  protected readonly types = signal<IStudyPlanCommentType[]>([]);
  protected readonly languages = signal<ILanguage[]>([]);
  protected readonly selectedCommentType = signal<IStudyPlanCommentType | null>(null);
  protected readonly comments = signal<IStudyPlanComment[]>([]);
  protected readonly grades = signal<IStudyPlanCommentGrade[]>([]);
  protected readonly commentOptions = signal<ScreenOptionItem[]>([]);
  protected readonly loadingComments = signal(false);
  protected readonly commentSearchTerm = signal('');
  protected readonly showCommentsWithoutGrades = signal(false);
  protected readonly creatingComment = signal(false);
  protected readonly editingCommentId = signal<number | null>(null);
  protected readonly assigningGradesCommentId = signal<number | null>(null);
  protected readonly selectedGradeIds = signal<number[]>([]);
  protected readonly creatingType = signal(false);
  protected readonly editingTypeId = signal<number | null>(null);
  protected readonly typeForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(128)],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    language_id: new FormControl<number | null>(null, Validators.required),
  });
  protected readonly commentForm = new FormGroup({
    comment: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });
  protected readonly commentEditorActive = computed(
    () => this.creatingComment() || this.editingCommentId() !== null,
  );
  protected readonly commentWorkspaceActive = computed(
    () => this.commentEditorActive() || this.assigningGradesCommentId() !== null,
  );
  protected readonly assigningGradesComment = computed(() => {
    const commentId = this.assigningGradesCommentId();

    return commentId === null
      ? null
      : this.comments().find((comment) => comment.id === commentId) ?? null;
  });
  protected readonly commentsWithoutGradesCount = computed(
    () => this.comments().filter((comment) => !comment.grades?.length).length,
  );
  protected readonly filteredComments = computed<StudyPlanCommentListItem[]>(() => {
    const term = this.commentSearchTerm().trim().toLocaleLowerCase();
    const showWithoutGrades = this.showCommentsWithoutGrades();

    return this.comments()
      .map((comment, index) => ({ comment, position: index + 1 }))
      .filter(({ comment }) => {
        const matchesSearch = !term || comment.comment.toLocaleLowerCase().includes(term);
        const matchesGradeFilter = !showWithoutGrades || !comment.grades?.length;

        return matchesSearch && matchesGradeFilter;
      });
  });

  private lastRequestKey: string | null = null;
  private lastCommentRequestKey: string | null = null;

  constructor() {
    super();

    effect(() => {
      const controller = this.controller();
      const studyPlanId = this.studyPlan().id;
      const requestKey = `${controller.name}:${studyPlanId}`;

      if (requestKey === this.lastRequestKey) {
        return;
      }

      this.lastRequestKey = requestKey;
      this.apiRoute.set(controller.name);
      this.types.set([]);
      this.languages.set([]);
      this.selectedCommentType.set(null);
      this.comments.set([]);
      this.grades.set([]);
      this.commentOptions.set([]);
      this.loadingComments.set(false);
      this.commentSearchTerm.set('');
      this.showCommentsWithoutGrades.set(false);
      this.lastCommentRequestKey = null;
      this.closeTypeEditor();
      this.closeCommentEditor();
      this.closeAssignGrades();
      this.clearScreenOptions();
      this.clearScreenChildren();
      this.loadCommentTypes(controller.name, studyPlanId, requestKey);
    });

    effect(() => {
      if (this.showCommentsWithoutGrades() && this.commentsWithoutGradesCount() === 0) {
        this.showCommentsWithoutGrades.set(false);
      }
    });
  }

  protected selectCommentType(type: IStudyPlanCommentType | null): void {
    if (this.commentWorkspaceActive() || this.selectedCommentType()?.id === type?.id) {
      return;
    }

    this.selectedCommentType.set(type);
    this.commentSearchTerm.set('');
    this.showCommentsWithoutGrades.set(false);

    if (!type) {
      this.comments.set([]);
      this.grades.set([]);
      this.commentOptions.set([]);
      this.loadingComments.set(false);
      this.lastCommentRequestKey = null;
      return;
    }

    if (!this.getScreenChild('study-plan-type-comments')) {
      this.comments.set([]);
      this.grades.set([]);
      this.commentOptions.set([]);
      this.loadingComments.set(false);
      this.lastCommentRequestKey = null;
      return;
    }

    const requestKey = `${this.studyPlan().id}:${type.id}`;

    this.lastCommentRequestKey = requestKey;
    this.loadingComments.set(true);
    this.loadTypeComments(this.studyPlan().id, type.id, requestKey);
  }

  protected startCreateType(): void {
    if (this.loading() || this.commentWorkspaceActive()) {
      return;
    }

    this.editingTypeId.set(null);
    this.typeForm.reset({ name: '', description: '', language_id: null });
    this.creatingType.set(true);
  }

  protected onCommentSearch(event: Event): void {
    this.commentSearchTerm.set((event.target as HTMLInputElement).value);
  }

  protected toggleCommentsWithoutGrades(): void {
    this.showCommentsWithoutGrades.update((value) => !value);
  }

  protected editType(type: IStudyPlanCommentType): void {
    if (this.loading() || this.commentWorkspaceActive()) {
      return;
    }

    this.creatingType.set(false);
    this.editingTypeId.set(type.id);
    this.typeForm.reset({
      name: type.name,
      description: type.description,
      language_id: type.language_id,
    });
  }

  protected cancelTypeEditor(): void {
    this.closeTypeEditor();
  }

  protected startCreateComment(): void {
    if (
      this.commentWorkspaceActive() ||
      this.creatingType() ||
      this.editingTypeId() !== null ||
      !this.selectedCommentType()
    ) {
      return;
    }

    this.editingCommentId.set(null);
    this.commentForm.reset({ comment: '' });
    this.creatingComment.set(true);
  }

  protected editComment(comment: IStudyPlanComment): void {
    if (this.commentWorkspaceActive() || this.creatingType() || this.editingTypeId() !== null) {
      return;
    }

    this.creatingComment.set(false);
    this.editingCommentId.set(comment.id);
    this.commentForm.reset({ comment: comment.comment });
  }

  protected cancelCommentEditor(): void {
    this.closeCommentEditor();
  }

  protected assignGrades(comment: IStudyPlanComment): void {
    if (this.commentWorkspaceActive() || this.creatingType() || this.editingTypeId() !== null) {
      return;
    }

    this.assigningGradesCommentId.set(comment.id);
    this.selectedGradeIds.set([...new Set(comment.grades?.map((grade) => grade.id) ?? [])]);
  }

  protected isGradeSelected(gradeId: number): boolean {
    return this.selectedGradeIds().includes(gradeId);
  }

  protected toggleGrade(gradeId: number): void {
    this.selectedGradeIds.update((gradeIds) =>
      gradeIds.includes(gradeId)
        ? gradeIds.filter((currentGradeId) => currentGradeId !== gradeId)
        : [...gradeIds, gradeId],
    );
  }

  protected cancelAssignGrades(): void {
    this.closeAssignGrades();
  }

  protected saveAssignedGrades(): void {
    if (this.loading()) {
      return;
    }

    const commentType = this.selectedCommentType();
    const commentId = this.assigningGradesCommentId();

    if (!commentType || commentId === null) {
      return;
    }

    const route =
      `planning/study-plan-type-comments/${this.studyPlan().id}/${commentType.id}/${commentId}/grades`;
    const payload = {
      grade_ids: this.selectedGradeIds(),
    };

    this.executeMutationRequest<StudyPlanCommentMutationPayload>(
      this.api.put<StudyPlanCommentMutationPayload>(route, payload),
      (response) => {
        const savedComment = response.data.comment;

        this.comments.update((comments) =>
          comments.map((comment) => (comment.id === savedComment.id ? savedComment : comment)),
        );
        this.closeAssignGrades();
      },
    );
  }

  protected saveComment(): void {
    if (this.commentForm.invalid) {
      this.commentForm.markAllAsTouched();
      return;
    }

    const commentType = this.selectedCommentType();
    const editingCommentId = this.editingCommentId();

    if (!commentType || (!this.creatingComment() && editingCommentId === null)) {
      return;
    }

    const payload = {
      comment: this.commentForm.controls.comment.value.trim(),
    };
    const route = `planning/study-plan-type-comments/${this.studyPlan().id}/${commentType.id}`;
    const request = this.creatingComment()
      ? this.api.post<StudyPlanCommentMutationPayload>(route, payload)
      : this.api.put<StudyPlanCommentMutationPayload>(`${route}/${editingCommentId}`, payload);

    this.executeMutationRequest<StudyPlanCommentMutationPayload>(request, (response) => {
      const savedComment = response.data.comment;

      if (this.creatingComment()) {
        this.comments.update((comments) =>
          [...comments, savedComment].sort((first, second) => first.id - second.id),
        );
        this.updateSelectedCommentTypeCount(commentType.id);
      } else {
        this.comments.update((comments) =>
          comments.map((comment) => (comment.id === savedComment.id ? savedComment : comment)),
        );
      }

      this.closeCommentEditor();
    });
  }

  protected saveType(): void {
    const editingTypeId = this.editingTypeId();

    if (this.loading() || (!this.creatingType() && editingTypeId === null) || this.typeForm.invalid) {
      this.typeForm.markAllAsTouched();
      return;
    }

    const formValue = this.typeForm.getRawValue();

    if (formValue.language_id === null) {
      return;
    }

    const payload = {
      name: formValue.name.trim(),
      description: formValue.description.trim(),
      language_id: formValue.language_id,
    };
    const route = `planning/${this.controller().name}/${this.studyPlan().id}`;
    const request = this.creatingType()
      ? this.api.post<StudyPlanCommentTypeMutationPayload>(route, payload)
      : this.api.put<StudyPlanCommentTypeMutationPayload>(`${route}/${editingTypeId}`, payload);

    this.executeMutationRequest<StudyPlanCommentTypeMutationPayload>(request, (response) => {
      const savedType = response.data.type;

      if (this.creatingType()) {
        this.types.update((types) => this.orderTypes([...types, savedType]));
        this.selectCommentType(savedType);
      } else {
        this.types.update((types) =>
          this.orderTypes(types.map((type) => (type.id === savedType.id ? savedType : type))),
        );

        if (this.selectedCommentType()?.id === savedType.id) {
          this.selectedCommentType.set(savedType);
        }
      }

      this.closeTypeEditor();
    });
  }

  protected async deleteType(type: IStudyPlanCommentType): Promise<void> {
    if (this.loading() || this.commentWorkspaceActive()) {
      return;
    }

    const message = this.translate.instant(
      'planning.study-plan-comment-types.delete-confirmation.message',
      { name: type.name },
    );
    const confirmed = await this.confirmDelete(
      'planning.study-plan-comment-types.delete-confirmation.title',
      message,
    );

    if (!confirmed || this.loading() || this.commentWorkspaceActive()) {
      return;
    }

    const currentTypes = this.types();
    const deletedIndex = currentTypes.findIndex((currentType) => currentType.id === type.id);
    const route = `planning/${this.controller().name}/${this.studyPlan().id}/${type.id}`;

    this.executeMutationRequest<null>(this.api.delete(route), () => {
      const remainingTypes = currentTypes.filter((currentType) => currentType.id !== type.id);
      this.types.set(remainingTypes);

      if (this.editingTypeId() === type.id) {
        this.closeTypeEditor();
      }

      if (this.selectedCommentType()?.id === type.id) {
        this.selectCommentType(remainingTypes[deletedIndex] ?? remainingTypes[deletedIndex - 1] ?? null);
      }
    });
  }

  protected async deleteComment(comment: IStudyPlanComment): Promise<void> {
    if (this.loading() || this.commentWorkspaceActive()) {
      return;
    }

    const message = this.translate.instant(
      'planning.study-plan-comments.delete-confirmation.message',
    );
    const confirmed = await this.confirmDelete(
      'planning.study-plan-comments.delete-confirmation.title',
      message,
    );

    if (!confirmed || this.loading() || this.commentWorkspaceActive()) {
      return;
    }

    const commentType = this.selectedCommentType();

    if (!commentType) {
      return;
    }

    const route =
      `planning/study-plan-type-comments/${this.studyPlan().id}/${commentType.id}/${comment.id}`;

    this.executeMutationRequest<null>(this.api.delete(route), () => {
      this.comments.update((comments) =>
        comments.filter((currentComment) => currentComment.id !== comment.id),
      );
      this.updateSelectedCommentTypeCount(commentType.id, -1);
    });
  }

  protected closeView(): void {
    this.close.emit();
  }

  protected getCommentOption(name: string): ScreenOptionItem | null {
    return this.commentOptions().find((option) => option.name === name) ?? null;
  }

  protected getCommentOptionVariant(
    name: string,
    fallback: 'primary' | 'secondary' | 'ghost' | 'danger' = 'secondary',
  ): 'primary' | 'secondary' | 'ghost' | 'danger' {
    const color = this.getCommentOption(name)?.color;

    return color === 'primary' || color === 'secondary' || color === 'ghost' || color === 'danger'
      ? color
      : fallback;
  }

  private loadCommentTypes(controllerName: string, studyPlanId: number, requestKey: string): void {
    this.executeSilentRequest<StudyPlanCommentTypesPayload>(
      this.api.get(`planning/${controllerName}/${studyPlanId}`),
      (response) => {
        if (requestKey !== this.lastRequestKey) {
          return;
        }

        this.setScreenOptions(response.data.options);
        this.setScreenChildren(response.data.children);
        this.languages.set(response.data.languages);
        this.types.set(response.data.types);
        this.selectCommentType(response.data.types[0] ?? null);
      },
    );
  }

  private loadTypeComments(
    studyPlanId: number,
    commentTypeId: number,
    requestKey: string,
  ): void {
    this.executeSilentRequest<StudyPlanTypeCommentsPayload>(
      this.api.get(`planning/study-plan-type-comments/${studyPlanId}/${commentTypeId}`),
      (response) => {
        if (
          requestKey !== this.lastCommentRequestKey ||
          this.selectedCommentType()?.id !== commentTypeId
        ) {
          return;
        }

        this.commentOptions.set(response.data.options);
        this.grades.set(response.data.grades);
        this.comments.set(response.data.comments);
      },
      undefined,
      () => {
        if (requestKey === this.lastCommentRequestKey) {
          this.loadingComments.set(false);
        }
      },
    );
  }

  private closeTypeEditor(): void {
    this.creatingType.set(false);
    this.editingTypeId.set(null);
    this.typeForm.reset({ name: '', description: '', language_id: null });
  }

  private closeCommentEditor(): void {
    this.creatingComment.set(false);
    this.editingCommentId.set(null);
    this.commentForm.reset({ comment: '' });
  }

  private closeAssignGrades(): void {
    this.assigningGradesCommentId.set(null);
    this.selectedGradeIds.set([]);
  }

  private updateSelectedCommentTypeCount(commentTypeId: number, delta: number = 1): void {
    this.types.update((types) =>
      types.map((type) =>
        type.id === commentTypeId
          ? { ...type, comments_count: Math.max(0, (type.comments_count ?? 0) + delta) }
          : type,
      ),
    );
    this.selectedCommentType.update((type) =>
      type?.id === commentTypeId
        ? { ...type, comments_count: Math.max(0, (type.comments_count ?? 0) + delta) }
        : type,
    );
  }

  private orderTypes(types: IStudyPlanCommentType[]): IStudyPlanCommentType[] {
    return [...types].sort((first, second) => first.order - second.order);
  }
}
