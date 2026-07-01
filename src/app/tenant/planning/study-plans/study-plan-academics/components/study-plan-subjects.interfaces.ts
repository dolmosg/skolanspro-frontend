/**
 * DTOs and ViewModels for the Study Plan Stage Subjects screen.
 *
 * These types are based on partial projections returned by StudyPlanSubjects@index:
 * subject only includes id, code, and name; coordinators include partial Person data;
 * catalogs.coordinators is a selector DTO. Full Laravel model contracts live in
 * shared/interfaces and are imported here when the payload matches them.
 */
import { ScreenChildItem, ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import type {
  IEvaluationType,
  IGrade,
  IGradePolicy,
  ISubjectType,
} from '@shared/interfaces/configuration.interfaces';
import type {
  IStudyPlanStage as SharedStudyPlanStage,
  IStudyPlanStageSubject as SharedStudyPlanStageSubject,
} from '@shared/interfaces/study-plan-interfaces';

export interface IStudyPlanSubjectCoordinator {
  id: number;
  name?: string;
  lastname?: string;
  mothername?: string;
  full: string;
  full_name: string;
  initials?: string;
  photo?: string;
}

export interface IStudyPlanSubjectItem {
  id: number;
  code: string;
  name: string;
}

export interface IStudyPlanStageSubject
  extends Omit<SharedStudyPlanStageSubject, 'subject' | 'coordinators'> {
  subject?: IStudyPlanSubjectItem | null;
  coordinators?: IStudyPlanSubjectCoordinator[];
}

export interface IStudyPlanStageSubjectsStage extends Omit<SharedStudyPlanStage, 'subjects'> {
  subjects?: IStudyPlanStageSubject[];
}

export interface IStudyPlanCoordinator {
  id: number;
  full: string;
  full_name: string;
  photo?: string | null;
}

export interface IStudyPlanStageSubjectsCatalogs {
  subject_types: ISubjectType[];
  evaluation_types: IEvaluationType[];
  grade_policies: IGradePolicy[];
  coordinators: IStudyPlanCoordinator[];
}

export interface StageSubjectGradeItem {
  gradeId: number;
  label: string;
  count: number;
  selected: boolean;
}

export interface StudyPlanStageSubjectsData {
  stage?: IStudyPlanStageSubjectsStage | null;
  grades?: IGrade[];
  options?: ScreenOptionItem[];
  children?: ScreenChildItem[];
  catalogs?: Partial<IStudyPlanStageSubjectsCatalogs>;
}
