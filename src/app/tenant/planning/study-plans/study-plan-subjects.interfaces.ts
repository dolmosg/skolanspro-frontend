import { ScreenChildItem, ScreenOptionItem } from "@shared/interfaces/configuration.interfaces";
import { IStudyPlanGrade } from "./study-plan-academics/study-plan-academics.component";

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

export interface IStudyPlanStageSubject {
  id: number;
  study_plan_stage_id: number;
  subject_id: number;
  grade_id: number | null;
  subject_type_id: number;
  evaluation_type_id: number;
  grade_policy_id: number | null;
  order: number;
  extra: boolean;
  descriptive_show: boolean;
  descriptive_full: boolean;
  subject?: IStudyPlanSubjectItem | null;
  coordinators?: IStudyPlanSubjectCoordinator[];
}

export interface IStudyPlanStageSubjectsStage {
  id: number;
  study_plan_id: number;
  name: string;
  start_date: string;
  end_date: string;
  order: number;
  subjects?: IStudyPlanStageSubject[];
}

export interface IStudyPlanCatalogItem {
  id: number;
  name: string;
  translation: string;
  help_translation?: string | null;
  active: boolean;
  order: number;
}

export interface IStudyPlanSubjectType extends IStudyPlanCatalogItem {
  help_translation?: string | null;
  can_create: boolean;
  can_remove: boolean;
  automatic: boolean;
  searchable: boolean;
  uses_teams: boolean;
}

export interface IStudyPlanGradePolicy extends IStudyPlanCatalogItem {
  configurable: boolean;
}

export interface IStudyPlanCoordinator {
  id: number;
  full: string;
  full_name: string;
  photo?: string | null;
}

export interface IStudyPlanStageSubjectsCatalogs {
  subject_types: IStudyPlanSubjectType[];
  evaluation_types: IStudyPlanCatalogItem[];
  grade_policies: IStudyPlanGradePolicy[];
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
  grades?: IStudyPlanGrade[];
  options?: ScreenOptionItem[];
  children?: ScreenChildItem[];
  catalogs?: Partial<IStudyPlanStageSubjectsCatalogs>;
}