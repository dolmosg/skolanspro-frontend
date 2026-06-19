import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { SklConfirmModal } from '@shared/base/skl-confirm-modal/skl-confirm-modal';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import { SkSelectComponent } from '@shared/ui/sk-select/sk-select.component';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';

interface ConfirmModalData {
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  type: 'danger';
}

export interface SubjectBaseEntity {
  id: number;
  name: string;
  description?: string | null;
  translation?: string | null;
  css_class?: string | null;
  order?: number;
  active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface SubjectSection extends SubjectBaseEntity {
  capital?: string | null;
  gender_id?: number | null;
}

export interface SubjectLevel extends SubjectBaseEntity {
  registration?: string | null;
  revoe?: string | null;
  billing?: string | null;
  organization_logo_id?: number | null;
  grades?: SubjectGrade[];
}

export interface SubjectGrade extends SubjectBaseEntity {
  level_id: number;
  level?: SubjectLevel | null;
}

export interface SubjectLearningArea {
  id: number;
  name: string;
  translation: string | null;
  color: string | null;
  active: boolean;
  order: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface SubjectSubcategory {
  id: number;
  subject_classification_id: number;
  name: string;
  translation: string | null;
  active: boolean;
  order: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface SubjectClassification {
  id: number;
  name: string;
  translation: string | null;
  color?: string | null;
  active: boolean;
  order: number;
  created_at?: string | null;
  updated_at?: string | null;
  subcategories?: SubjectSubcategory[];
}

export interface SubjectListItem {
  id: number;
  learning_area_id: number | null;
  grade_id: number | null;
  section_id: number;
  subject_classification_id: number | null;
  subject_subcategory_id: number | null;
  name: string;
  short_name: string | null;
  code: string | null;
  css_class: string | null;
  official: boolean;
  weekly_blocks: number;
  active: boolean;
  order: number;
  created_at?: string | null;
  updated_at?: string | null;

  learning_area?: SubjectLearningArea | null;
  grade?: SubjectGrade | null;
  section?: SubjectSection | null;
  classification?: SubjectClassification | null;
  subcategory?: SubjectSubcategory | null;
}

export interface SubjectPayload {
  name: string;
  short_name: string | null;
  code: string | null;
  weekly_blocks: number;
  learning_area_id: number | null;
  grade_id: number | null;
  section_id: number;
  subject_classification_id: number | null;
  subject_subcategory_id: number | null;
  official: boolean;
  active: boolean;
  css_class: string | null;
  order: number;
}

export interface SubjectMutationData {
  subject?: SubjectListItem;
  item?: SubjectListItem;
}

export interface SubjectsIndexData {
  subjects?: SubjectListItem[];
  sections?: SubjectSection[];
  classifications?: SubjectClassification[];
  'learning-areas'?: SubjectLearningArea[];
  levels?: SubjectLevel[];
  options?: ScreenOptionItem[];
}

@Component({
  selector: 'app-subjects',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
    UiButtonComponent,
    UiIconComponent,
    SkSelectComponent,
  ],
  templateUrl: './subjects.component.html',
  styleUrl: './subjects.component.scss',
})
export class SubjectsComponent extends SkolansBaseComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly subjects = signal<SubjectListItem[]>([]);
  protected readonly sections = signal<SubjectSection[]>([]);
  protected readonly classifications = signal<SubjectClassification[]>([]);
  protected readonly levels = signal<SubjectLevel[]>([]);
  protected readonly learningAreas = signal<SubjectLearningArea[]>([]);

  protected readonly selectedSectionId = signal<number | null>(null);
  protected readonly selectedLevelId = signal<number | null>(null);
  protected readonly selectedGradeId = signal<number | null>(null);
  protected readonly selectedSubjectClassificationId = signal<number | null>(null);

  protected readonly codeFilter = signal('');
  protected readonly activeFilter = signal<'all' | 'active' | 'inactive'>('all');
  protected readonly officialFilter = signal<'all' | 'official' | 'unofficial'>('all');

  protected readonly selectedSubject = signal<SubjectListItem | null>(null);
  protected readonly editingSubject = signal(false);
  protected readonly creatingSubject = signal(false);

  protected readonly isEditingMode = computed(
    () => this.editingSubject() || this.creatingSubject(),
  );

  protected readonly sectionControl = new FormControl<number | null>(null);
  protected readonly levelControl = new FormControl<number | null>(null);
  protected readonly gradeControl = new FormControl<number | null>(null);

  protected readonly activeControl = new FormControl<'all' | 'active' | 'inactive'>('all', {
    nonNullable: true,
  });

  protected readonly officialControl = new FormControl<'all' | 'official' | 'unofficial'>('all', {
    nonNullable: true,
  });

  protected readonly subjectForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(70)]],
    short_name: [''],
    code: [''],
    weekly_blocks: [0, [Validators.required, Validators.min(0)]],
    learning_area_id: [null as number | null],
    subject_classification_id: [null as number | null],
    subject_subcategory_id: [null as number | null],
    official: [true],
    active: [true],
  });

  protected readonly activeOptions = [
    { id: 'all', label: 'academics.subjects.options.all' },
    { id: 'active', label: 'academics.subjects.options.active' },
    { id: 'inactive', label: 'academics.subjects.options.inactive' },
  ];

  protected readonly officialOptions = [
    { id: 'all', label: 'academics.subjects.options.all' },
    { id: 'official', label: 'academics.subjects.options.official' },
    { id: 'unofficial', label: 'academics.subjects.options.unofficial' },
  ];

  protected readonly totalSubjects = computed(() => this.subjects().length);

  protected readonly hasRequiredContext = computed(
    () =>
      this.selectedSectionId() !== null &&
      this.selectedLevelId() !== null &&
      this.selectedGradeId() !== null,
  );

  protected readonly availableGrades = computed(() => {
    const levelId = this.selectedLevelId();

    if (!levelId) {
      return this.levels().flatMap((level) => level.grades ?? []);
    }

    return this.levels().find((level) => level.id === levelId)?.grades ?? [];
  });

  protected readonly availableSubcategories = computed(() => {
    const classificationId = this.selectedSubjectClassificationId();

    if (!classificationId) {
      return [];
    }

    return (
      this.classifications().find((classification) => classification.id === classificationId)
        ?.subcategories ?? []
    );
  });

  protected readonly filteredSubjects = computed(() => {
    if (!this.hasRequiredContext()) {
      return [];
    }

    const sectionId = this.selectedSectionId();
    const gradeId = this.selectedGradeId();
    const code = this.codeFilter().trim().toLowerCase();
    const active = this.activeFilter();
    const official = this.officialFilter();

    return this.subjects().filter((subject) => {
      const matchesSection = subject.section_id === sectionId;
      const matchesGrade = subject.grade_id === gradeId;
      const matchesCode = !code || (subject.code ?? '').toLowerCase().includes(code);

      const matchesActive =
        active === 'all' ||
        (active === 'active' && subject.active) ||
        (active === 'inactive' && !subject.active);

      const matchesOfficial =
        official === 'all' ||
        (official === 'official' && subject.official) ||
        (official === 'unofficial' && !subject.official);

      return matchesSection && matchesGrade && matchesCode && matchesActive && matchesOfficial;
    });
  });

  ngOnInit(): void {
    this.initRouteMeta();
    this.bindFilters();
    this.bindSubjectForm();
    this.reloadSubjects();
  }

  protected selectSubject(subject: SubjectListItem): void {
    this.selectedSubject.set(subject);
    this.creatingSubject.set(false);
    this.editingSubject.set(false);
    this.patchSubjectForm(subject);
  }

  protected startCreate(): void {
    const sectionId = this.selectedSectionId();
    const gradeId = this.selectedGradeId();

    if (sectionId === null || gradeId === null) {
      return;
    }

    this.selectedSubject.set(null);
    this.selectedSubjectClassificationId.set(null);
    this.creatingSubject.set(true);
    this.editingSubject.set(false);

    this.subjectForm.reset({
      name: '',
      short_name: '',
      code: '',
      weekly_blocks: 0,
      learning_area_id: null,
      subject_classification_id: null,
      subject_subcategory_id: null,
      official: true,
      active: true,
    });
  }

  protected startEdit(): void {
    const subject = this.selectedSubject();

    if (!subject) {
      return;
    }

    this.creatingSubject.set(false);
    this.patchSubjectForm(subject);
    this.editingSubject.set(true);
  }

  protected cancelEdit(): void {
    const subject = this.selectedSubject();

    if (subject) {
      this.patchSubjectForm(subject);
    }

    this.editingSubject.set(false);
  }

  protected cancelCreate(): void {
    this.creatingSubject.set(false);
    this.selectedSubjectClassificationId.set(null);

    this.subjectForm.reset({
      name: '',
      short_name: '',
      code: '',
      weekly_blocks: 0,
      learning_area_id: null,
      subject_classification_id: null,
      subject_subcategory_id: null,
      official: true,
      active: true,
    });
  }

  protected saveSubject(): void {
    const subject = this.selectedSubject();
    const route = this.apiRoute();

    if (!subject || !route) {
      return;
    }

    if (this.subjectForm.invalid) {
      this.subjectForm.markAllAsTouched();
      return;
    }

    this.executeMutationRequest<SubjectMutationData>(
      this.api.put(`${route}/${subject.id}`, this.buildSubjectPayload(subject)),
      (res) => {
        const updatedSubject = res.data.subject ?? res.data.item;

        if (!updatedSubject) {
          this.reloadSubjects();
          return;
        }

        this.subjects.update((current) =>
          current.map((item) => (item.id === updatedSubject.id ? updatedSubject : item)),
        );

        this.selectedSubject.set(updatedSubject);
        this.patchSubjectForm(updatedSubject);
        this.editingSubject.set(false);
      },
    );
  }

  protected saveNewSubject(): void {
    const route = this.apiRoute();
    const sectionId = this.selectedSectionId();
    const gradeId = this.selectedGradeId();

    if (!route || sectionId === null || gradeId === null) {
      return;
    }

    if (this.subjectForm.invalid) {
      this.subjectForm.markAllAsTouched();
      return;
    }

    this.executeMutationRequest<SubjectMutationData>(
      this.api.post(route, this.buildCreateSubjectPayload(sectionId, gradeId)),
      (res) => {
        const createdSubject = res.data.subject ?? res.data.item;

        if (!createdSubject) {
          this.reloadSubjects();
          return;
        }

        this.subjects.update((current) => [...current, createdSubject]);
        this.selectedSubject.set(createdSubject);
        this.patchSubjectForm(createdSubject);
        this.creatingSubject.set(false);
      },
    );
  }

  protected async deleteSubject(subject: SubjectListItem): Promise<void> {
  const route = this.apiRoute();

  if (!route) {
    return;
  }

  const confirmed = await this.modal.open<ConfirmModalData, boolean>({
    component: SklConfirmModal,
    title: this.translate.instant('academics.subjects.delete'),
    data: {
      message: this.translate.instant('academics.subjects.messages.confirm-delete'),
      confirmLabel: this.translate.instant('common.delete'),
      cancelLabel: this.translate.instant('common.cancel'),
      type: 'danger',
    },
    size: 'sm',
    closeOnBackdrop: true,
    closeOnEscape: true,
    showCloseButton: true,
  });

  if (!confirmed) {
    return;
  }

  this.executeMutationRequest(this.api.delete(`${route}/${subject.id}`), () => {
    this.subjects.update((current) => current.filter((item) => item.id !== subject.id));
    this.clearSelectedSubject();
  });
}

  protected onCodeFilter(event: Event): void {
    this.codeFilter.set((event.target as HTMLInputElement).value);
  }

  protected reloadSubjects(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.executeSilentRequest<SubjectsIndexData>(
      this.api.get(route),
      (res) => {
        this.subjects.set(res.data.subjects ?? []);
        this.sections.set(res.data.sections ?? []);
        this.classifications.set(res.data.classifications ?? []);
        this.learningAreas.set(res.data['learning-areas'] ?? []);
        this.levels.set(res.data.levels ?? []);
        this.setScreenOptions(res.data.options);
      },
      () => {
        this.subjects.set([]);
        this.sections.set([]);
        this.classifications.set([]);
        this.learningAreas.set([]);
        this.levels.set([]);
        this.clearSelectedSubject();
        this.clearScreenOptions();
      },
    );
  }

  private bindFilters(): void {
    this.sectionControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.selectedSectionId.set(value);
        this.clearSelectedSubject();
      });

    this.levelControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.selectedLevelId.set(value);
        this.gradeControl.setValue(null, { emitEvent: false });
        this.selectedGradeId.set(null);
        this.clearSelectedSubject();
      });

    this.gradeControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.selectedGradeId.set(value);
        this.clearSelectedSubject();
      });

    this.activeControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.activeFilter.set(value);
      });

    this.officialControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.officialFilter.set(value);
      });
  }

  private bindSubjectForm(): void {
    this.subjectForm.controls.subject_classification_id.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.selectedSubjectClassificationId.set(value);

        if (this.isEditingMode()) {
          this.subjectForm.controls.subject_subcategory_id.setValue(null);
        }
      });
  }

  private clearSelectedSubject(): void {
    this.selectedSubject.set(null);
    this.selectedSubjectClassificationId.set(null);
    this.editingSubject.set(false);
    this.creatingSubject.set(false);
  }

  private patchSubjectForm(subject: SubjectListItem): void {
    this.selectedSubjectClassificationId.set(subject.subject_classification_id);

    this.subjectForm.patchValue(
      {
        name: subject.name,
        short_name: subject.short_name ?? '',
        code: subject.code ?? '',
        weekly_blocks: subject.weekly_blocks,
        learning_area_id: subject.learning_area_id,
        subject_classification_id: subject.subject_classification_id,
        subject_subcategory_id: subject.subject_subcategory_id,
        official: subject.official,
        active: subject.active,
      },
      { emitEvent: false },
    );
  }

  private buildSubjectPayload(subject: SubjectListItem): SubjectPayload {
    const value = this.subjectForm.getRawValue();

    return {
      name: value.name.trim(),
      short_name: this.nullableTrim(value.short_name),
      code: this.nullableTrim(value.code),
      weekly_blocks: Number(value.weekly_blocks ?? 0),
      learning_area_id: value.learning_area_id ?? null,
      grade_id: subject.grade_id,
      section_id: subject.section_id,
      subject_classification_id: value.subject_classification_id ?? null,
      subject_subcategory_id: value.subject_subcategory_id ?? null,
      official: value.official,
      active: value.active,
      css_class: subject.css_class,
      order: subject.order,
    };
  }

  private buildCreateSubjectPayload(sectionId: number, gradeId: number): SubjectPayload {
    const value = this.subjectForm.getRawValue();

    return {
      name: value.name.trim(),
      short_name: this.nullableTrim(value.short_name),
      code: this.nullableTrim(value.code),
      weekly_blocks: Number(value.weekly_blocks ?? 0),
      learning_area_id: value.learning_area_id ?? null,
      grade_id: gradeId,
      section_id: sectionId,
      subject_classification_id: value.subject_classification_id ?? null,
      subject_subcategory_id: value.subject_subcategory_id ?? null,
      official: value.official,
      active: value.active,
      css_class: null,
      order: this.filteredSubjects().length,
    };
  }

  private nullableTrim(value: string | null | undefined): string | null {
    const trimmed = value?.trim() ?? '';

    return trimmed.length > 0 ? trimmed : null;
  }
}