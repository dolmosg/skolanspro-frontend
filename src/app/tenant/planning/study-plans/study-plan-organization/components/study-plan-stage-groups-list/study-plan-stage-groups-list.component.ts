import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import {
  ISklConfirmModalData,
  SklConfirmModal,
} from '@shared/base/skl-confirm-modal/skl-confirm-modal';
import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import type { ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import type { IGrade, IGroupType, IGender } from '@shared/interfaces/configuration.interfaces';
import type {
  IStudyPlanStage,
  IStudyPlanStageGroup,
  IStudyPlanStageSubject,
} from '@shared/interfaces/study-plan-interfaces';
import { FormErrorComponent } from '@shared/ui/form-error/form-error';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';

type StudyPlanStageGroupMode = 'grade' | 'crossover';
type StageGroupEditorMode = 'add' | 'edit' | null;
type StageGroupTypeFilter = 'all' | 'normal' | 'subject';
type StageGroupSubjectFilter = 'all' | number;
type StageGroupGenderFilter = 'all' | 'none' | number;

interface StageGroupTypeCounter {
  key: StageGroupTypeFilter;
  translation: string;
  count: number;
}

interface StageGroupSubjectOption {
  id: number;
  label: string;
  count: number;
}

interface StudyPlanStageGroupsCatalogs {
  'group-types': IGroupType[];
  genders: IGender[];
  grades: IGrade[];
  'stage-subjects': IStudyPlanStageSubject[];
}

interface StudyPlanStageGroupsContext {
  stage: IStudyPlanStage | null;
  grade_id: number | null;
  mode: StudyPlanStageGroupMode;
}

interface StudyPlanStageGroupsIndexResponse {
  groups: IStudyPlanStageGroup[];
  catalogs: StudyPlanStageGroupsCatalogs;
  context: StudyPlanStageGroupsContext;
  options: ScreenOptionItem[];
}

interface StageGroupEditorModel {
  mode: Exclude<StageGroupEditorMode, null>;
  groupId: number | null;
  group_type_id: number;
  grade_id: number | null;
  stage_subject_id: number | null;
  headingLabel: string | null;
  typeLabel: string;
  gradeLabel: string;
  subjectLabel: string;
}

interface StageGroupMutationPayload {
  group_type_id: number;
  grade_id: number | null;
  stage_subject_id: number | null;
  gender_id: number | null;
  code: string;
  name: string;
  quota: number;
  color: string | null;
  active: boolean;
}

type StageGroupSelectionTarget = { id: number } | { code: string } | null;

@Component({
  selector: 'app-study-plan-stage-groups-list',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    FormErrorComponent,
    UiButtonComponent,
    UiIconComponent,
  ],
  templateUrl: './study-plan-stage-groups-list.component.html',
  styleUrl: './study-plan-stage-groups-list.component.scss',
})
export class StudyPlanStageGroupsListComponent extends SkolansBaseComponent {
  private readonly fb = inject(FormBuilder);

  readonly route = input<string | null>(null);
  readonly stageId = input.required<number | null>();
  readonly gradeId = input.required<number | null>();
  readonly mode = input.required<StudyPlanStageGroupMode | null>();
  readonly saved = output<void>();

  private readonly loadedKey = signal<string | null>(null);

  protected readonly groups = signal<IStudyPlanStageGroup[]>([]);
  protected readonly catalogs = signal<StudyPlanStageGroupsCatalogs | null>(null);
  protected readonly context = signal<StudyPlanStageGroupsContext | null>(null);
  protected readonly searchTerm = signal('');
  protected readonly selectedType = signal<StageGroupTypeFilter>('all');
  protected readonly selectedSubject = signal<StageGroupSubjectFilter>('all');
  protected readonly selectedGender = signal<StageGroupGenderFilter>('all');
  protected readonly selectedGroupId = signal<number | null>(null);
  protected readonly editorMode = signal<StageGroupEditorMode>(null);
  protected readonly editorModel = signal<StageGroupEditorModel | null>(null);
  protected readonly savingEditor = signal(false);
  protected readonly editorForm = this.fb.group({
    code: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(10)]),
    name: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(128)]),
    quota: this.fb.nonNullable.control(30, [Validators.required, Validators.min(1)]),
    gender_id: this.fb.control<number | null>(null),
    color: this.fb.control<string | null>(null),
    active: this.fb.nonNullable.control(true),
  });
  protected readonly hasGroups = computed(() => this.groups().length > 0);
  protected readonly hasFilteredGroups = computed(() => this.filteredGroups().length > 0);
  protected readonly hasActiveFilters = computed(() => {
    return (
      this.searchTerm().trim().length > 0 ||
      this.selectedType() !== 'all' ||
      this.selectedSubject() !== 'all' ||
      this.selectedGender() !== 'all'
    );
  });
  protected readonly selectedSubjectValue = computed(() =>
    this.filterValue(this.selectedSubject()),
  );
  protected readonly selectedGenderValue = computed(() => this.filterValue(this.selectedGender()));
  protected readonly selectedGroup = computed(() => {
    const selectedGroupId = this.selectedGroupId();

    if (selectedGroupId === null) {
      return null;
    }

    return this.groups().find((group) => group.id === selectedGroupId) ?? null;
  });
  protected readonly hasSelectedGroup = computed(() => !!this.selectedGroup());
  protected readonly selectedDeleteMode = computed(() => this.selectedGroup()?.delete?.mode ?? null);
  protected readonly canDeleteSelectedGroup = computed(() => {
    const mode = this.selectedDeleteMode();

    return mode === 'normal' || mode === 'force_empty_assignments';
  });
  protected readonly canCreateGroup = computed(() => this.context()?.mode === 'grade');
  protected readonly selectionLabel = computed(() => {
    const context = this.context();

    if (!context) {
      return 'common.no-data';
    }

    if (context.mode === 'crossover') {
      return 'planning.study-plan-organizations.stage-groups.labels.crossover';
    }

    const grade = this.catalogs()?.grades.find((item) => item.id === context.grade_id);

    return grade?.name ?? grade?.description ?? 'common.no-data';
  });
  protected readonly typeCounters = computed<StageGroupTypeCounter[]>(() => {
    const groups = this.groups();
    const allCounter: StageGroupTypeCounter = {
      key: 'all',
      translation: 'planning.study-plan-organizations.stage-groups.filters.all',
      count: groups.length,
    };

    if (this.context()?.mode === 'crossover') {
      return [allCounter];
    }

    return [
      allCounter,
      {
        key: 'normal',
        translation: 'planning.study-plan-organizations.stage-groups.filters.normal',
        count: groups.filter((group) => !this.groupRequiresSubject(group)).length,
      },
      {
        key: 'subject',
        translation: 'planning.study-plan-organizations.stage-groups.filters.subject',
        count: groups.filter((group) => this.groupRequiresSubject(group)).length,
      },
    ];
  });
  protected readonly subjectOptions = computed<StageGroupSubjectOption[]>(() => {
    const options = new Map<number, StageGroupSubjectOption>();

    for (const group of this.groups()) {
      const stageSubject = this.resolveStageSubject(group);
      const subject = stageSubject?.subject;

      if (!stageSubject || !subject) {
        continue;
      }

      const current = options.get(stageSubject.id);
      const label = this.buildSubjectLabel(stageSubject);

      if (!label) {
        continue;
      }

      options.set(stageSubject.id, {
        id: stageSubject.id,
        label,
        count: (current?.count ?? 0) + 1,
      });
    }

    return [...options.values()].sort((a, b) => a.label.localeCompare(b.label));
  });
  protected readonly genderOptions = computed(() => this.catalogs()?.genders ?? []);
  protected readonly hasGenderlessGroups = computed(() =>
    this.groups().some((group) => group.gender_id === null),
  );
  protected readonly filteredGroups = computed(() => {
    const term = this.normalize(this.searchTerm());
    const selectedType = this.selectedType();
    const selectedSubject = this.selectedSubject();
    const selectedGender = this.selectedGender();

    return this.groups().filter((group) => {
      if (term && !this.matchesSearch(group, term)) {
        return false;
      }

      if (!this.matchesType(group, selectedType)) {
        return false;
      }

      if (selectedSubject !== 'all' && group.stage_subject_id !== selectedSubject) {
        return false;
      }

      if (selectedGender === 'none' && group.gender_id !== null) {
        return false;
      }

      if (typeof selectedGender === 'number' && group.gender_id !== selectedGender) {
        return false;
      }

      return true;
    });
  });

  constructor() {
    super();

    effect(() => {
      const route = this.route();
      const stageId = this.stageId();
      const gradeId = this.gradeId();
      const mode = this.mode();

      if (!route || !stageId || !mode || (mode === 'grade' && gradeId === null)) {
        this.resetState();
        return;
      }

      const key = `${route}/${stageId}:${mode}:${gradeId ?? 'crossover'}`;

      if (this.loadedKey() === key) {
        return;
      }

      this.loadedKey.set(key);
      this.groups.set([]);
      this.catalogs.set(null);
      this.context.set(null);
      this.clearScreenOptions();
      this.resetFilters();
      this.clearSelection();
      this.closeEditor();
      this.savingEditor.set(false);
      this.loadGroups(route, stageId, gradeId, mode, key);
    });

    effect(() => {
      const selectedGroupId = this.selectedGroupId();

      if (selectedGroupId === null) {
        return;
      }

      if (!this.filteredGroups().some((group) => group.id === selectedGroupId)) {
        this.clearSelection();
      }
    });
  }

  private resetState(): void {
    this.loadedKey.set(null);
    this.groups.set([]);
    this.catalogs.set(null);
    this.context.set(null);
    this.clearScreenOptions();
    this.resetFilters();
    this.clearSelection();
    this.closeEditor();
    this.savingEditor.set(false);
  }

  private loadGroups(
    route: string,
    stageId: number,
    gradeId: number | null,
    mode: StudyPlanStageGroupMode,
    key: string,
    selectionTarget: StageGroupSelectionTarget = null,
  ): void {
    this.executeSilentRequest<StudyPlanStageGroupsIndexResponse>(
      this.api.get(this.groupsRoute(route, stageId, gradeId, mode)),
      (res) => {
        if (this.loadedKey() !== key) {
          return;
        }

        this.setScreenOptions(res.data.options);
        this.groups.set(res.data.groups);
        this.catalogs.set(res.data.catalogs);
        this.context.set(res.data.context);
        this.restoreSelection(selectionTarget);
      },
      () => {
        if (this.loadedKey() !== key) {
          return;
        }

        this.groups.set([]);
        this.catalogs.set(null);
        this.context.set(null);
        this.clearScreenOptions();
        this.clearSelection();
        this.closeEditor();
      },
    );
  }

  private groupsRoute(
    route: string,
    stageId: number,
    gradeId: number | null,
    mode: StudyPlanStageGroupMode,
  ): string {
    if (mode === 'grade' && gradeId !== null) {
      return `${route}/${stageId}?grade_id=${gradeId}`;
    }

    return `${route}/${stageId}`;
  }

  protected groupTypeTranslation(group: IStudyPlanStageGroup): string {
    const type =
      group.type ??
      this.catalogs()?.['group-types'].find((item) => item.id === group.group_type_id);

    return type?.translation ?? type?.name ?? 'common.no-data';
  }

  protected genderTranslation(group: IStudyPlanStageGroup): string {
    if (!group.gender_id) {
      return 'planning.study-plan-organizations.stage-groups.labels.no-gender';
    }

    const gender =
      group.gender ?? this.catalogs()?.genders.find((item) => item.id === group.gender_id);

    return (
      gender?.translation ??
      gender?.name ??
      'planning.study-plan-organizations.stage-groups.labels.no-gender'
    );
  }

  protected subjectLabel(group: IStudyPlanStageGroup): string {
    return (
      this.buildSubjectLabel(this.resolveStageSubject(group)) ??
      'planning.study-plan-organizations.stage-groups.labels.no-subject'
    );
  }

  protected colorLabel(group: IStudyPlanStageGroup): string {
    return group.color ?? 'planning.study-plan-organizations.stage-groups.labels.no-color-short';
  }

  protected activeLabel(group: IStudyPlanStageGroup): string {
    return group.active ? 'common.active' : 'common.inactive';
  }

  protected setSearchTerm(event: Event): void {
    const target = event.target as HTMLInputElement | null;

    this.searchTerm.set(target?.value ?? '');
  }

  protected setSelectedSubject(event: Event): void {
    const target = event.target as HTMLSelectElement | null;

    this.selectedSubject.set(this.parseNumericFilter(target?.value ?? 'all'));
  }

  protected setSelectedGender(event: Event): void {
    const target = event.target as HTMLSelectElement | null;

    this.selectedGender.set(this.parseGenderFilter(target?.value ?? 'all'));
  }

  protected selectTypeCounter(type: StageGroupTypeCounter['key']): void {
    this.selectedType.set(type);
  }

  protected selectGroup(group: IStudyPlanStageGroup): void {
    if (this.savingEditor()) {
      return;
    }

    this.selectedGroupId.update((current) => (current === group.id ? null : group.id));
  }

  protected isGroupSelected(group: IStudyPlanStageGroup): boolean {
    return this.selectedGroupId() === group.id;
  }

  protected startCreate(): void {
    if (!this.canCreateGroup() || this.savingEditor()) {
      return;
    }

    const editorModel = this.createEditorModel();

    if (!editorModel) {
      return;
    }

    this.editorModel.set(editorModel);
    this.editorForm.reset({
      code: '',
      name: '',
      quota: 30,
      gender_id: null,
      color: null,
      active: true,
    });
    this.editorMode.set('add');
  }

  protected startEdit(): void {
    if (this.savingEditor()) {
      return;
    }

    const group = this.selectedGroup();

    if (!group) {
      return;
    }

    this.editorModel.set(this.editEditorModel(group));
    this.editorForm.reset({
      code: group.code,
      name: group.name,
      quota: group.quota,
      gender_id: group.gender_id,
      color: group.color,
      active: group.active,
    });
    this.editorMode.set('edit');
  }

  protected async startDelete(): Promise<void> {
    const deleteMode = this.selectedDeleteMode();

    if (deleteMode === 'blocked') {
      return;
    }

    const route = this.route();
    const stageId = this.stageId();
    const group = this.selectedGroup();

    if (!route || !stageId || !group || this.savingEditor()) {
      return;
    }

    const forceDelete = deleteMode === 'force_empty_assignments';
    const confirmed = forceDelete
      ? await this.confirmForceEmptyAssignmentsDelete(group)
      : await this.confirmStageGroupDelete(group);

    if (!confirmed) {
      return;
    }

    const deleteRoute = forceDelete
      ? `${route}/${stageId}/${group.id}?force=true`
      : `${route}/${stageId}/${group.id}`;

    this.savingEditor.set(true);

    this.executeMutationRequest<StudyPlanStageGroupsIndexResponse>(
      this.api.delete(deleteRoute),
      () => {
        this.closeEditor();
        this.clearSelection();
        this.reloadCurrentContext(null);
        this.saved.emit();
      },
      () => {
        this.savingEditor.set(false);
      },
    );
  }

  protected cancelEditor(): void {
    if (this.savingEditor()) {
      return;
    }

    this.closeEditor();
  }

  protected saveEditor(): void {
    const route = this.route();
    const stageId = this.stageId();
    const mode = this.editorMode();
    const editorModel = this.editorModel();

    if (!route || !stageId || !mode || !editorModel || this.savingEditor()) {
      return;
    }

    this.editorForm.markAllAsTouched();
    this.editorForm.updateValueAndValidity();

    if (this.editorForm.invalid) {
      return;
    }

    const payload = this.editorPayload(editorModel);
    const selectionTarget: StageGroupSelectionTarget =
      mode === 'edit' && editorModel.groupId !== null
        ? { id: editorModel.groupId }
        : { code: payload.code };
    const request =
      mode === 'add'
        ? this.api.post<StudyPlanStageGroupsIndexResponse>(`${route}/${stageId}`, payload)
        : this.api.put<StudyPlanStageGroupsIndexResponse>(
            `${route}/${stageId}/${editorModel.groupId}`,
            payload,
          );

    this.savingEditor.set(true);

    this.executeMutationRequest<StudyPlanStageGroupsIndexResponse>(
      request,
      () => {
        this.closeEditor();
        this.reloadCurrentContext(selectionTarget);
        this.saved.emit();
      },
      () => {
        this.savingEditor.set(false);
      },
    );
  }

  protected setEditorColor(event: Event): void {
    const target = event.target as HTMLInputElement | null;

    this.editorForm.controls.color.setValue(target?.value || null);
    this.editorForm.controls.color.markAsDirty();
  }

  protected clearFilters(): void {
    this.resetFilters();
  }

  protected subjectOptionLabel(option: StageGroupSubjectOption): string {
    return `${option.label} (${option.count})`;
  }

  private resetFilters(): void {
    this.searchTerm.set('');
    this.selectedType.set('all');
    this.selectedSubject.set('all');
    this.selectedGender.set('all');
  }

  private clearSelection(): void {
    this.selectedGroupId.set(null);

    if (this.editorMode() === 'edit') {
      this.closeEditor();
    }
  }

  private closeEditor(): void {
    this.editorMode.set(null);
    this.editorModel.set(null);
    this.editorForm.reset({
      code: '',
      name: '',
      quota: 30,
      gender_id: null,
      color: null,
      active: true,
    });
  }

  private reloadCurrentContext(selectionTarget: StageGroupSelectionTarget): void {
    const route = this.route();
    const stageId = this.stageId();
    const gradeId = this.gradeId();
    const mode = this.mode();
    const key = this.loadedKey();

    if (!route || !stageId || !mode || !key) {
      return;
    }

    this.loadGroups(route, stageId, gradeId, mode, key, selectionTarget);
  }

  private async confirmStageGroupDelete(group: IStudyPlanStageGroup): Promise<boolean> {
    const groupLabel = this.groupDisplayLabel(group);
    const confirmed = await this.modal.open<ISklConfirmModalData, boolean>({
      component: SklConfirmModal,
      title: this.translate.instant(
        'planning.study-plan-organizations.stage-groups.delete.title',
      ),
      data: {
        message: this.translate.instant(
          'planning.study-plan-organizations.stage-groups.delete.message',
          { group: groupLabel },
        ),
        confirmLabel: this.translate.instant('common.delete'),
        cancelLabel: this.translate.instant('common.cancel'),
        type: 'danger',
      },
      size: 'sm',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    return confirmed === true;
  }

  private async confirmForceEmptyAssignmentsDelete(
    group: IStudyPlanStageGroup,
  ): Promise<boolean> {
    const groupLabel = this.groupDisplayLabel(group);
    const assignmentsCount = group.delete?.assignments_count ?? 0;
    const confirmed = await this.modal.open<ISklConfirmModalData, boolean>({
      component: SklConfirmModal,
      title: this.translate.instant(
        'planning.study-plan-organizations.stage-groups.force-delete.title',
      ),
      data: {
        message: this.translate.instant(
          'planning.study-plan-organizations.stage-groups.force-delete.message',
          {
            group: groupLabel,
            count: assignmentsCount,
          },
        ),
        confirmLabel: this.translate.instant(
          'planning.study-plan-organizations.stage-groups.force-delete.confirm',
        ),
        cancelLabel: this.translate.instant('common.cancel'),
        type: 'danger',
      },
      size: 'sm',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    return confirmed === true;
  }

  private groupDisplayLabel(group: IStudyPlanStageGroup): string {
    return `${group.code} · ${group.name}`;
  }

  private restoreSelection(selectionTarget: StageGroupSelectionTarget): void {
    if (!selectionTarget) {
      if (
        this.selectedGroupId() !== null &&
        !this.filteredGroups().some((group) => group.id === this.selectedGroupId())
      ) {
        this.clearSelection();
      }

      return;
    }

    const selectedGroup =
      'id' in selectionTarget
        ? this.groups().find((group) => group.id === selectionTarget.id)
        : this.groups().find(
            (group) => this.normalize(group.code) === this.normalize(selectionTarget.code),
          );

    if (!selectedGroup || !this.groupMatchesCurrentFilters(selectedGroup)) {
      this.clearSelection();
      return;
    }

    this.selectedGroupId.set(selectedGroup.id);
  }

  private createEditorModel(): StageGroupEditorModel | null {
    const context = this.context();
    const groupTypeName = this.createGroupTypeName();
    const groupType = this.groupTypeByName(groupTypeName);

    if (!context || !groupType) {
      return null;
    }

    const stageSubjectId = this.createStageSubjectId();

    return {
      mode: 'add',
      groupId: null,
      group_type_id: groupType.id,
      grade_id: context.mode === 'grade' ? context.grade_id : null,
      stage_subject_id: stageSubjectId,
      headingLabel: null,
      typeLabel: groupType.translation ?? groupType.name ?? 'common.no-data',
      gradeLabel: this.gradeLabel(context.grade_id),
      subjectLabel: this.stageSubjectLabel(stageSubjectId),
    };
  }

  private editEditorModel(group: IStudyPlanStageGroup): StageGroupEditorModel {
    return {
      mode: 'edit',
      groupId: group.id,
      group_type_id: group.group_type_id,
      grade_id: group.grade_id,
      stage_subject_id: group.stage_subject_id,
      headingLabel: `${group.code} · ${group.name}`,
      typeLabel: this.groupTypeTranslation(group),
      gradeLabel: this.groupGradeLabel(group),
      subjectLabel: this.subjectLabel(group),
    };
  }

  private editorPayload(editorModel: StageGroupEditorModel): StageGroupMutationPayload {
    const value = this.editorForm.getRawValue();

    return {
      group_type_id: editorModel.group_type_id,
      grade_id: editorModel.grade_id,
      stage_subject_id: editorModel.stage_subject_id,
      gender_id: value.gender_id,
      code: value.code.trim(),
      name: value.name.trim(),
      quota: Number(value.quota),
      color: value.color || null,
      active: value.active,
    };
  }

  private matchesSearch(group: IStudyPlanStageGroup, term: string): boolean {
    return this.normalize(group.code).includes(term) || this.normalize(group.name).includes(term);
  }

  private matchesType(group: IStudyPlanStageGroup, selectedType: StageGroupTypeFilter): boolean {
    if (selectedType === 'all') {
      return true;
    }

    if (selectedType === 'normal') {
      return !this.groupRequiresSubject(group);
    }

    if (selectedType === 'subject') {
      return this.groupRequiresSubject(group);
    }

    return true;
  }

  private groupMatchesCurrentFilters(group: IStudyPlanStageGroup): boolean {
    const term = this.normalize(this.searchTerm());
    const selectedType = this.selectedType();
    const selectedSubject = this.selectedSubject();
    const selectedGender = this.selectedGender();

    if (term && !this.matchesSearch(group, term)) {
      return false;
    }

    if (!this.matchesType(group, selectedType)) {
      return false;
    }

    if (selectedSubject !== 'all' && group.stage_subject_id !== selectedSubject) {
      return false;
    }

    if (selectedGender === 'none' && group.gender_id !== null) {
      return false;
    }

    if (typeof selectedGender === 'number' && group.gender_id !== selectedGender) {
      return false;
    }

    return true;
  }

  private groupRequiresSubject(group: IStudyPlanStageGroup): boolean {
    const type =
      group.type ??
      this.catalogs()?.['group-types'].find((item) => item.id === group.group_type_id);

    return type?.requires_subject ?? group.stage_subject_id !== null;
  }

  private resolveStageSubject(
    group: IStudyPlanStageGroup,
  ): IStudyPlanStageSubject | null | undefined {
    if (!group.stage_subject_id) {
      return null;
    }

    return (
      group.subject ??
      this.catalogs()?.['stage-subjects'].find((item) => item.id === group.stage_subject_id)
    );
  }

  private buildSubjectLabel(
    stageSubject: IStudyPlanStageSubject | null | undefined,
  ): string | null {
    const subject = stageSubject?.subject;

    if (!subject) {
      return null;
    }

    return subject.code ? `${subject.code} - ${subject.name}` : subject.name;
  }

  private createGroupTypeName(): 'normal' | 'subject' | 'crossover' {
    if (this.context()?.mode === 'crossover') {
      return 'crossover';
    }

    if (this.selectedType() === 'subject' || typeof this.selectedSubject() === 'number') {
      return 'subject';
    }

    return 'normal';
  }

  private createStageSubjectId(): number | null {
    const selectedSubject = this.selectedSubject();

    return typeof selectedSubject === 'number' ? selectedSubject : null;
  }

  private groupTypeByName(name: 'normal' | 'subject' | 'crossover'): IGroupType | null {
    return this.catalogs()?.['group-types'].find((type) => type.name === name) ?? null;
  }

  private groupGradeLabel(group: IStudyPlanStageGroup): string {
    return group.grade?.name ?? group.grade?.description ?? this.gradeLabel(group.grade_id);
  }

  private gradeLabel(gradeId: number | null): string {
    if (gradeId === null) {
      return 'common.no-data';
    }

    const grade = this.catalogs()?.grades.find((item) => item.id === gradeId);

    return grade?.name ?? grade?.description ?? 'common.no-data';
  }

  private stageSubjectLabel(stageSubjectId: number | null): string {
    if (stageSubjectId === null) {
      return 'planning.study-plan-organizations.stage-groups.labels.no-subject';
    }

    return (
      this.buildSubjectLabel(
        this.catalogs()?.['stage-subjects'].find((item) => item.id === stageSubjectId),
      ) ?? 'planning.study-plan-organizations.stage-groups.labels.no-subject'
    );
  }

  private normalize(value: string | null | undefined): string {
    return (value ?? '').trim().toLocaleLowerCase();
  }

  private filterValue(value: StageGroupSubjectFilter | StageGroupGenderFilter): string {
    return typeof value === 'number' ? String(value) : value;
  }

  private parseGenderFilter(value: string): StageGroupGenderFilter {
    if (value === 'none') {
      return 'none';
    }

    return this.parseNumericFilter(value);
  }

  private parseNumericFilter(value: string): StageGroupSubjectFilter {
    if (value === 'all') {
      return 'all';
    }

    const parsedValue = Number(value);

    return Number.isFinite(parsedValue) ? parsedValue : 'all';
  }
}
