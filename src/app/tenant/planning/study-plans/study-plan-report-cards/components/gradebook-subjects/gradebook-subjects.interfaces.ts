import type { ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import type { IGradebook } from '@shared/interfaces/study-plan-interfaces';

export interface GradebookSubjectsGradeDto {
  id: number;
  name: string;
  order: number;
}

export interface GradebookSubjectsStageDto {
  id: number;
  name: string;
  order: number;
  has_crossovers: boolean;
}

export interface GradebookSubjectItemDto {
  id: number;
  order: number;
  stage_subject_id: number;
  study_plan_stage_id: number;
  grade_id: number | null;
  subject: {
    id: number;
    code: string | null;
    name: string;
  };
}

export interface GradebookSubjectCandidateDto {
  stage_subject_id: number;
  subject: {
    id: number;
    code: string | null;
    name: string;
  };
}

export interface GradebookSubjectCandidatesResponse {
  candidates: GradebookSubjectCandidateDto[];
}

export interface GradebookSubjectsStoreResponse {
  subjects: GradebookSubjectItemDto[];
}

export interface GradebookSubjectsResponse {
  gradebook: Pick<IGradebook, 'id' | 'name'>;
  stage: GradebookSubjectsStageDto;
  grades: GradebookSubjectsGradeDto[];
  subjects: GradebookSubjectItemDto[];
  options: ScreenOptionItem[];
}

export type GradebookSubjectContext =
  | {
      type: 'grade';
      gradeId: number;
    }
  | {
      type: 'crossovers';
    };
