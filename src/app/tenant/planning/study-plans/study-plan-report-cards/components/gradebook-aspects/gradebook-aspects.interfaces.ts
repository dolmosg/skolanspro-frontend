import type { ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import type { ISubject } from '@shared/interfaces/academics.interfaces';
import type { IGrade } from '@shared/interfaces/configuration.interfaces';
import type { IGradebook } from '@shared/interfaces/study-plan-interfaces';

/** Read-only navigation contract returned by study-plan-report-card-aspects. */
export interface GradebookAspectSubjectDto {
  id: number;
  order: number;
  stage_subject_id: number;
  subject: Pick<ISubject, 'id' | 'code' | 'name'>;
}

export interface GradebookAspectGradeDto extends Pick<IGrade, 'id' | 'name' | 'order'> {
  subjects: GradebookAspectSubjectDto[];
}

export interface GradebookAspectsStageDto {
  id: number;
  name: string;
  order: number;
  has_crossovers: boolean;
}

export interface GradebookAspectsResponse {
  gradebook: Pick<IGradebook, 'id' | 'name'>;
  stage: GradebookAspectsStageDto;
  grades: GradebookAspectGradeDto[];
  crossovers: GradebookAspectSubjectDto[];
  options: ScreenOptionItem[];
}

/** Server-owned selected-state projection returned for one GradebookSubject. */
export interface GradebookAspectDto {
  id: number;
  name: string;
  selected: boolean;
}

export interface GradebookSubjectAspectsResponse {
  gradebook_subject: GradebookAspectSubjectDto;
  aspects: GradebookAspectDto[];
  options: ScreenOptionItem[];
}
