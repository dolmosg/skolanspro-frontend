import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, OnInit, computed, input, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { SkolansBaseComponent } from '@shared/base/skolans-base-component';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';
import { UiDrawerComponent } from '@shared/ui/ui-drawer/ui-drawer';
import { UiIconComponent } from '@shared/ui/ui-icon/ui-icon';
import {
  UiSelectionListComponent,
  type UiSelectionId,
  type UiSelectionItem,
} from '@shared/ui/ui-selection-list/ui-selection-list';

import type { StudyPlanReportCardItemDto } from '../../study-plan-report-cards.interfaces';
import type {
  GradebookSection,
  GradebookSectionCandidateGroup,
  GradebookSectionCandidatesResponse,
  GradebookSectionsResponse,
} from './gradebook-sections.interfaces';

/**
 * Read-only presentation of the ordered section composition of one gradebook.
 *
 * The parent detail resolves the child route and current gradebook. This child
 * owns its request lifecycle and the transient candidates drawer state. The
 * backend remains the authority for candidate eligibility and composition.
 */
@Component({
  selector: 'app-gradebook-sections',
  imports: [
    DragDropModule,
    TranslatePipe,
    UiButtonComponent,
    UiDrawerComponent,
    UiIconComponent,
    UiSelectionListComponent,
  ],
  templateUrl: './gradebook-sections.component.html',
  styleUrl: './gradebook-sections.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GradebookSectionsComponent extends SkolansBaseComponent implements OnInit {
  readonly gradebook = input.required<StudyPlanReportCardItemDto>();
  readonly route = input.required<string>();

  protected readonly loadedGradebook = signal<GradebookSectionsResponse['gradebook'] | null>(null);
  protected readonly sections = signal<GradebookSection[]>([]);
  protected readonly loaded = signal(false);
  protected readonly orderSaving = signal(false);
  protected readonly addDrawerOpen = signal(false);
  protected readonly candidateGroups = signal<GradebookSectionCandidateGroup[]>([]);
  protected readonly selectedCandidateIds = signal<Set<UiSelectionId>>(new Set());
  protected readonly candidatesLoading = signal(false);
  protected readonly addSaving = signal(false);
  protected readonly deletingSectionId = signal<number | null>(null);
  protected readonly selectedCandidatesCount = computed(() => this.selectedCandidateIds().size);
  private candidatesRequestSequence = 0;

  ngOnInit(): void {
    this.loadSections();
  }

  protected reorderSections(event: CdkDragDrop<GradebookSection[]>): void {
    if (!this.getScreenOption('order') || this.orderSaving() || this.addSaving() || this.deletingSectionId() !== null) {
      return;
    }

    if (event.previousIndex === event.currentIndex) {
      return;
    }

    const reorderedSections = [...this.sections()];
    moveItemInArray(reorderedSections, event.previousIndex, event.currentIndex);

    this.orderSaving.set(true);

    this.executeSilentRequest<GradebookSectionsResponse>(
      this.api.put(
        `${this.route()}/${this.gradebook().id}/order`,
        { sections: reorderedSections.map((section) => section.id) },
        { loader: false },
      ),
      (response) => {
        this.loadedGradebook.set(response.data.gradebook);
        this.sections.set(response.data.sections);
        this.setScreenOptions(response.data.options);
      },
      undefined,
      () => this.orderSaving.set(false),
    );
  }

  protected openAddDrawer(): void {
    if (!this.getScreenOption('add') || this.orderSaving() || this.addSaving() || this.deletingSectionId() !== null) {
      return;
    }

    this.candidateGroups.set([]);
    this.selectedCandidateIds.set(new Set());
    this.addDrawerOpen.set(true);
    this.loadCandidates();
  }

  protected closeAddDrawer(): void {
    if (this.addSaving()) {
      return;
    }

    this.candidatesRequestSequence++;
    this.addDrawerOpen.set(false);
    this.candidatesLoading.set(false);
    this.candidateGroups.set([]);
    this.selectedCandidateIds.set(new Set());
  }

  protected candidateItems(group: GradebookSectionCandidateGroup): UiSelectionItem[] {
    return group.candidates.map((candidate) => ({
      id: candidate.id,
      code: candidate.code,
      name: candidate.name ?? '',
    }));
  }

  protected onCandidateSelectionChange({ id, checked }: { id: UiSelectionId; checked: boolean }): void {
    this.selectedCandidateIds.update((current) => {
      const next = new Set(current);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  }

  protected addSections(): void {
    const sectionIds = Array.from(this.selectedCandidateIds());

    if (!sectionIds.length || this.addSaving() || this.orderSaving()) {
      return;
    }

    this.addSaving.set(true);

    this.executeMutationRequest<GradebookSectionsResponse>(
      this.api.post(`${this.route()}/${this.gradebook().id}`, { sections: sectionIds }),
      (response) => {
        this.loadedGradebook.set(response.data.gradebook);
        this.sections.set(response.data.sections);
        this.setScreenOptions(response.data.options);
        this.addSaving.set(false);
        this.closeAddDrawer();
      },
      () => this.addSaving.set(false),
    );
  }

  protected async deleteSection(section: GradebookSection): Promise<void> {
    if (
      !this.getScreenOption('delete') ||
      this.addSaving() ||
      this.orderSaving() ||
      this.deletingSectionId() !== null
    ) {
      return;
    }

    const confirmed = await this.confirmDelete(
      'planning.study-plan-report-card-sections.delete',
      'planning.study-plan-report-card-sections.messages.confirm-delete',
      { name: section.name },
    );

    if (
      !confirmed ||
      this.addSaving() ||
      this.orderSaving() ||
      this.deletingSectionId() !== null
    ) {
      return;
    }

    this.deletingSectionId.set(section.id);

    this.executeMutationRequest<GradebookSectionsResponse>(
      this.api.delete(`${this.route()}/${this.gradebook().id}/${section.id}`),
      (response) => {
        this.loadedGradebook.set(response.data.gradebook);
        this.sections.set(response.data.sections);
        this.setScreenOptions(response.data.options);
      },
      () => this.deletingSectionId.set(null),
    );
  }

  private loadSections(): void {
    this.loaded.set(false);

    this.executeSilentRequest<GradebookSectionsResponse>(
      this.api.get(`${this.route()}/${this.gradebook().id}`),
      (response) => {
        this.loadedGradebook.set(response.data.gradebook);
        this.sections.set(response.data.sections);
        this.setScreenOptions(response.data.options);
        this.loaded.set(true);
      },
    );
  }

  private loadCandidates(): void {
    const requestSequence = ++this.candidatesRequestSequence;

    this.candidatesLoading.set(true);

    this.executeSilentRequest<GradebookSectionCandidatesResponse>(
      this.api.get(`${this.route()}/${this.gradebook().id}/candidates`, { loader: false }),
      (response) => {
        if (requestSequence !== this.candidatesRequestSequence || !this.addDrawerOpen()) {
          return;
        }

        this.candidateGroups.set(response.data.groups);
      },
      () => {
        if (requestSequence === this.candidatesRequestSequence) {
          this.candidateGroups.set([]);
        }
      },
      () => {
        if (requestSequence === this.candidatesRequestSequence) {
          this.candidatesLoading.set(false);
        }
      },
    );
  }
}
