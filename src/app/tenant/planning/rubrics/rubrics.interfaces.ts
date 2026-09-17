import type { ScreenChildItem, ScreenOptionItem } from '@shared/interfaces/access.interfaces';
import type { ISchoolYear } from '@shared/interfaces/administration.interfaces';
import type { ISubject } from '@shared/interfaces/academics.interfaces';
import type { IRubricType } from '@shared/interfaces/configuration.interfaces';
import type {
  IRubric,
  IRubricScale,
  IRubricSection,
  IRubricSkill,
} from '@shared/interfaces/planning.interfaces';
import type { IRole } from '@shared/interfaces/identity.interfaces';
import type {
  IStudyPlanStage,
  IStudyPlanStageGroup,
  IStudyPlanStageSubject,
  IStudyPlanTerm,
} from '@shared/interfaces/study-plan-interfaces';

/**
 * Initial academic selector context for the Rubrics screen.
 *
 * Domain entities remain represented by their canonical shared interfaces;
 * this DTO only composes the endpoint-specific bootstrap payload.
 */
export interface RubricsIndexDto {
  years: ISchoolYear[];
  stages: IStudyPlanStage[];
  catalogs: {
    rubric_types: IRubricType[];
  };
  options: ScreenOptionItem[];
  children: ScreenChildItem[];
}

/**
 * Presentation projection required by SkSelect's simple bindLabel contract.
 * The canonical stage model remains unmodified.
 */
export type RubricsStageOptionDto = Pick<IStudyPlanStage, 'id'> & {
  label: string;
};

export interface RubricsListDto {
  rubrics: IRubric[];
}

export interface RubricsMutationDto {
  rubric: IRubric;
}

/** Payload returned by the rubric-terms child controller. */
export interface RubricTermsIndexDto {
  rubric: IRubric;
  study_plan_terms: IStudyPlanTerm[];
  terms: IStudyPlanTerm[];
  options: ScreenOptionItem[];
}

/** Canonical relation returned after synchronizing rubric term assignments. */
export interface RubricTermsMutationDto {
  study_plan_terms: IStudyPlanTerm[];
}

/** Payload returned by the rubric-scales child controller. */
export interface RubricScalesIndexDto {
  rubric: IRubric;
  rubric_scales: IRubricScale[];
  options: ScreenOptionItem[];
}

/** Canonical scale returned after creating or updating a rubric scale. */
export interface RubricScaleMutationDto {
  rubric_scale: IRubricScale;
}

export interface RubricSectionsCatalogsDto {
  evaluator_roles: IRole[];
  stage_subjects: IStudyPlanStageSubject[];
}

/** Payload returned by the rubric-sections child controller. */
export interface RubricSectionsIndexDto {
  rubric: IRubric;
  rubric_sections: IRubricSection[];
  catalogs: RubricSectionsCatalogsDto;
  options: ScreenOptionItem[];
  children: ScreenChildItem[];
}

/** Canonical section returned after creating or updating a rubric section. */
export interface RubricSectionMutationDto {
  rubric_section: IRubricSection;
}

/** Payload returned by the rubric-skills child controller. */
export interface RubricSkillsIndexDto {
  rubric_section: IRubricSection;
  rubric_skills: IRubricSkill[];
  options: ScreenOptionItem[];
}

/** Canonical Skill returned after creating or updating a rubric Skill. */
export interface RubricSkillMutationDto {
  rubric_skill: IRubricSkill;
}

/** Candidate Group projection returned by the rubric-assignments controller. */
export type RubricAssignmentGroup = Pick<
  IStudyPlanStageGroup,
  | 'id'
  | 'study_plan_stage_id'
  | 'grade_id'
  | 'group_type_id'
  | 'code'
  | 'name'
  | 'active'
  | 'order'
> & {
  selected: boolean;
};

/** RubricSection projection enriched with its assigned StageSubject count. */
export type RubricAssignmentSection = IRubricSection & {
  stage_subjects_count: number;
};

/** Read-only payload returned by the rubric-assignments child controller. */
export interface RubricAssignmentsIndexDto {
  rubric: Pick<IRubric, 'id' | 'name' | 'study_plan_stage_id' | 'grade_id'>;
  groups: RubricAssignmentGroup[];
  rubric_sections: RubricAssignmentSection[];
  options: ScreenOptionItem[];
}

/** Canonical Groups returned after replacing a rubric assignment. */
export interface RubricAssignmentGroupsMutationDto {
  groups: RubricAssignmentGroup[];
}

/** StageSubject candidate projected for one RubricSection assignment editor. */
export interface RubricAssignmentStageSubject {
  id: number;
  subject_id: number;
  order: number;
  selected: boolean;
  subject: Pick<ISubject, 'id' | 'code' | 'name'>;
}

/** Canonical GET/PUT payload for one RubricSection subject assignment. */
export interface RubricAssignmentSubjectsDto {
  rubric_section: Pick<RubricAssignmentSection, 'id' | 'name' | 'stage_subjects_count'>;
  stage_subjects: RubricAssignmentStageSubject[];
}
