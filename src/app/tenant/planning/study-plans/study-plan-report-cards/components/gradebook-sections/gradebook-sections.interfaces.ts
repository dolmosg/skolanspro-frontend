import type { ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import type { IGradebook } from '@shared/interfaces/study-plan-interfaces';

/** Read-only contract returned by study-plan-report-card-sections. */
export interface GradebookSectionsResponse {
  gradebook: Pick<IGradebook, 'id' | 'name'>;
  sections: GradebookSection[];
  options: ScreenOptionItem[];
}

/** Read-only candidates contract returned by study-plan-report-card-sections/{gradebook}/candidates. */
export interface GradebookSectionCandidatesResponse {
  gradebook: Pick<IGradebook, 'id' | 'name'>;
  groups: GradebookSectionCandidateGroup[];
}

export interface GradebookSectionCandidateGroup {
  type: GradebookSectionType;
  candidates: GradebookSectionCandidate[];
}

export type GradebookSectionCandidate =
  | GradebookSectionComponentCandidate
  | GradebookSectionGradebookCandidate;

export interface GradebookSectionComponentCandidate {
  kind: 'component';
  id: number;
  code: string;
  name: string | null;
  page_break: boolean;
}

export interface GradebookSectionGradebookCandidate {
  kind: 'gradebook';
  id: string;
  code: string;
  name: string;
}

export interface GradebookSection {
  id: number;
  code: string;
  name: string;
  page_break: boolean;
  order: number;
  gradebook_component_id: number | null;
  referenced_gradebook_id: number | null;
  type: string | null;
  component: GradebookSectionComponent | null;
  referenced_gradebook: ReferencedGradebook | null;
}

export interface GradebookSectionComponent {
  id: number;
  code: string;
  description: string | null;
  section_type: GradebookSectionType | null;
}

export interface GradebookSectionType {
  id: number;
  name: string;
  translation: string | null;
}

export interface ReferencedGradebook {
  id: number;
  name: string;
}
