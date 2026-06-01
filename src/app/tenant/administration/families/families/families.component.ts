import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { ScreenOptionItem } from '@shared/interfaces/configuration.interfaces';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { FamilyModalComponent } from '../family-modal/family-modal.component';
import { Router } from '@angular/router';

type FamilySearchMode = 'family' | 'students';

interface FamilySearchStatus {
  id: number;
  name: string;
  translation: string;
  css_class: string;
}

interface FamilySearchResult {
  id: number;
  code?: string | null;
  family_name: string;
  display_name?: string;
  email?: string | null;
  matched_by: FamilySearchMode;

  status?: FamilySearchStatus | null;

  students?: {
    id: number;
    full_name: string;
    match?: boolean;
  }[];
}

interface FamiliesSearchResponse {
  families: FamilySearchResult[];
  has_more: boolean;
}

interface FamilyStatus {
  id: number;
  name: string;
  translation: string;
  css_class: string;
  active: boolean;
  order: number;
}

interface FamiliesIndexResponse {
  options: ScreenOptionItem[];
  family_statuses: FamilyStatus[];
}

@Component({
  selector: 'app-families',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, UiButtonComponent],
  templateUrl: './families.component.html',
  styleUrl: './families.component.scss',
})
export class FamiliesComponent extends SkolansBaseComponent {
  private readonly fb = new FormBuilder();

  constructor(private readonly router: Router) {
    super();
  }

  families = signal<FamilySearchResult[]>([]);
  selectedFamily = signal<FamilySearchResult | null>(null);
  hasMore = signal(false);
  searched = signal(false);
  searchMode = signal<FamilySearchMode>('family');

  familyStatuses = signal<FamilyStatus[]>([]);

  form = this.fb.group({
    name: [''],
    lastname: [''],
    mothername: [''],
  });

  isStudentSearch = computed(() => this.searchMode() === 'students');
  hasResults = computed(() => this.families().length > 0);

  emptyMessage = computed(() => {
    if (!this.searched()) {
      return 'families.search.emptyInitial';
    }

    return 'families.search.emptyResults';
  });

  ngOnInit(): void {
    this.initRouteMeta();
    this.loadOptions();
  }

  loadOptions(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    this.executeSilentRequest<FamiliesIndexResponse>(
      this.api.get<FamiliesIndexResponse>(route),
      (res) => {
        this.options.set(res.data.options ?? []);
        this.familyStatuses.set(res.data.family_statuses ?? []);
      },
    );
  }

  setSearchMode(mode: FamilySearchMode): void {
    this.searchMode.set(mode);

    if (mode === 'family') {
      this.form.controls.name.setValue('');
    }

    this.families.set([]);
    this.selectedFamily.set(null);
    this.hasMore.set(false);
    this.searched.set(false);
  }

  search(): void {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    const payload = this.cleanPayload({
      mode: this.searchMode(),
      ...this.form.value,
    });

    if (Object.keys(payload).length <= 1) {
      this.toast.warning(this.translate.instant('families.messages.search-filter-required'));
      return;
    }

    this.executeSilentRequest<FamiliesSearchResponse>(
      this.api.post<FamiliesSearchResponse>(`${route}/search`, payload),
      (res) => {
        this.families.set(res.data.families ?? []);
        this.hasMore.set(res.data.has_more ?? false);
        this.selectedFamily.set(null);
        this.searched.set(true);
      },
    );
  }

  reset(): void {
    this.form.reset({
      name: '',
      lastname: '',
      mothername: '',
    });

    this.searchMode.set('family');
    this.families.set([]);
    this.selectedFamily.set(null);
    this.hasMore.set(false);
    this.searched.set(false);
  }

  selectFamily(family: FamilySearchResult): void {
    this.selectedFamily.set(family);
    this.router.navigate([family.id], {
      relativeTo: this.activatedRoute,
    });
  }

  trackByFamilyId(_: number, family: FamilySearchResult): number {
    return family.id;
  }

  trackByStudentId(_: number, student: { id: number; full_name: string; match?: boolean }): number {
    return student.id;
  }

  private cleanPayload(value: any): Record<string, any> {
    return Object.entries(value).reduce(
      (payload, [key, fieldValue]) => {
        if (fieldValue !== null && fieldValue !== undefined && fieldValue !== '') {
          payload[key] = fieldValue;
        }

        return payload;
      },
      {} as Record<string, any>,
    );
  }

  async openCreateModal(): Promise<void> {
    const route = this.apiRoute();

    if (!route) {
      return;
    }

    const payload = await this.modal.open<any, Record<string, any> | null>({
      component: FamilyModalComponent,
      data: {
        familyStatuses: this.familyStatuses(),
      },
      title: this.translate.instant('administration.families.modal.title'),
      size: 'md',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
    });

    if (!payload) {
      return;
    }

    this.request(this.api.post(route, payload)).subscribe({
      next: (res: any) => {
        if (this.handleApiFailure(res)) {
          return;
        }

        this.handleApiSuccess(res);

        this.reset();
      },
      error: () => this.ignoreHandledRequestError(),
    });
  }
}
