import type { ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import type { IGradebook } from '@shared/interfaces/study-plan-interfaces';

export interface GradebookRubricsGradeDto { id: number; name: string; order: number; }
export interface GradebookRubricItemDto { id: number; order: number; rubric_id: number; grade_id: number; rubric: { id: number; name: string; qualifier: string | null; description: string | null; }; }
export interface GradebookRubricsResponse { gradebook: Pick<IGradebook, 'id' | 'name'>; stage: { id: number; name: string; order: number }; grades: GradebookRubricsGradeDto[]; rubrics: GradebookRubricItemDto[]; options: ScreenOptionItem[]; }
export interface GradebookRubricCandidateDto { id: number; name: string; qualifier: string | null; description: string | null; }
export interface GradebookRubricCandidatesResponse { candidates: GradebookRubricCandidateDto[]; }
export interface GradebookRubricsStoreResponse { rubrics: GradebookRubricItemDto[]; }
