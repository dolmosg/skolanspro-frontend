import { Component, OnInit, computed, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import type { ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import type { ITermStatus } from '@shared/interfaces/configuration.interfaces';
import type { IRole } from '@shared/interfaces/identity.interfaces';
import type { IStudyPlanRatingCapture } from '@shared/interfaces/study-plan-interfaces';
import { SkSelectComponent } from '@shared/ui/sk-select/sk-select.component';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

type StudyPlanGradeCaptureRole = Pick<IRole, 'id' | 'name' | 'translation'>;
type StudyPlanGradeCaptureTermStatus = Pick<
  ITermStatus,
  'id' | 'name' | 'translation' | 'order'
>;

interface StudyPlanGradeCapturePayload {
  items: IStudyPlanRatingCapture[];
  roles: StudyPlanGradeCaptureRole[];
  term_statuses: StudyPlanGradeCaptureTermStatus[];
  options: ScreenOptionItem[];
}

type GradeCaptureEditorMode = 'create' | 'edit' | null;

interface StudyPlanGradeCaptureMutationPayload {
  role_id: number;
  term_status_id: number;
}

interface StudyPlanGradeCaptureMutationResponse {
  item: IStudyPlanRatingCapture;
}

@Component({
  selector: 'app-study-plan-grade-capture-summary',
  imports: [ReactiveFormsModule, TranslatePipe, SkSelectComponent, UiButtonComponent],
  templateUrl: './study-plan-grade-capture-summary.component.html',
  styleUrl: './study-plan-grade-capture-summary.component.scss',
})
export class StudyPlanGradeCaptureSummaryComponent extends SkolansBaseComponent implements OnInit {
  readonly studyPlanId = input<number | null>(null);
  readonly route = input<string | null>(null);

  protected readonly payload = signal<StudyPlanGradeCapturePayload | null>(null);
  protected readonly editorMode = signal<GradeCaptureEditorMode>(null);
  protected readonly editingId = signal<number | null>(null);
  protected readonly availableRoles = computed(() => {
    const payload = this.payload();

    if (!payload) {
      return [];
    }

    const assignedRoleIds = new Set(payload.items.map((item) => item.role_id));

    return payload.roles.filter((role) => !assignedRoleIds.has(role.id));
  });
  protected readonly editorForm = new FormGroup({
    role_id: new FormControl<number | null>(null, Validators.required),
    term_status_id: new FormControl<number | null>(null, Validators.required),
  });

  ngOnInit(): void {
    this.loadGradeCaptures();
  }

  private loadGradeCaptures(): void {
    const route = this.route();
    const studyPlanId = this.studyPlanId();

    if (!route || !studyPlanId) {
      return;
    }

    this.executeSilentRequest<StudyPlanGradeCapturePayload>(
      this.api.get(`${route}/${studyPlanId}`),
      (response) => {
        this.payload.set(response.data);
        this.setScreenOptions(response.data.options);
      },
    );
  }

  protected startCreate(): void {
    if (this.editorMode() !== null || this.loading()) {
      return;
    }

    this.editorForm.reset({ role_id: null, term_status_id: null });
    this.editingId.set(null);
    this.editorMode.set('create');
  }

  protected startEdit(item: IStudyPlanRatingCapture): void {
    if (!item.deletable || this.editorMode() !== null || this.loading()) {
      return;
    }

    this.editorForm.reset({
      role_id: item.role_id,
      term_status_id: item.term_status_id,
    });
    this.editingId.set(item.id);
    this.editorMode.set('edit');
  }

  protected cancelEditor(): void {
    if (this.loading()) {
      return;
    }

    this.closeEditor();
  }

  protected saveEditor(): void {
    const route = this.route();
    const studyPlanId = this.studyPlanId();
    const mode = this.editorMode();
    const editingId = this.editingId();

    if (!route || !studyPlanId || !mode || this.loading()) {
      return;
    }

    this.editorForm.markAllAsTouched();

    if (this.editorForm.invalid || (mode === 'edit' && editingId === null)) {
      return;
    }

    const formValue = this.editorForm.getRawValue();

    if (formValue.role_id === null || formValue.term_status_id === null) {
      return;
    }

    const payload: StudyPlanGradeCaptureMutationPayload = {
      role_id: formValue.role_id,
      term_status_id: formValue.term_status_id,
    };
    const request =
      mode === 'create'
        ? this.api.post<StudyPlanGradeCaptureMutationResponse>(`${route}/${studyPlanId}`, payload)
        : this.api.put<StudyPlanGradeCaptureMutationResponse>(`${route}/${editingId}`, payload);

    this.executeMutationRequest<StudyPlanGradeCaptureMutationResponse>(request, () => {
      this.closeEditor();
      this.loadGradeCaptures();
    });
  }

  protected async deleteCapture(item: IStudyPlanRatingCapture): Promise<void> {
    const route = this.route();

    if (!item.deletable || !route || this.loading() || this.editorMode() !== null) {
      return;
    }

    const role = this.translate.instant(item.role?.translation ?? '');
    const confirmed = await this.confirmDelete(
      'planning.study-plan-evaluations.grade-capture.delete-confirmation-title',
      this.translate.instant('planning.study-plan-evaluations.grade-capture.delete-confirmation', {
        role,
      }),
    );

    if (!confirmed || !item.deletable || this.loading()) {
      return;
    }

    this.executeMutationRequest<null>(this.api.delete(`${route}/${item.id}`), () => {
      this.loadGradeCaptures();
    });
  }

  protected isEditing(itemId: number): boolean {
    return this.editorMode() === 'edit' && this.editingId() === itemId;
  }

  protected rolesForEditor(item: IStudyPlanRatingCapture): StudyPlanGradeCaptureRole[] {
    const payload = this.payload();

    if (!payload) {
      return [];
    }

    const assignedRoleIds = new Set(
      payload.items
        .filter((capture) => capture.id !== item.id)
        .map((capture) => capture.role_id),
    );

    return payload.roles.filter((role) => !assignedRoleIds.has(role.id));
  }

  private closeEditor(): void {
    this.editorForm.reset({ role_id: null, term_status_id: null });
    this.editingId.set(null);
    this.editorMode.set(null);
  }
}
