import { IGradebookSectionType } from './configuration.interfaces';
import type { IRole } from './identity.interfaces';
import type { IStudyPlanStageSubject } from './study-plan-interfaces';

export type RubricDisplayMode = 'name' | 'description' | 'both';

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Planning\Gradebooks\GradebookComponent
 */
export interface IGradebookComponent {
  id: number;
  code: string;
  description: string | null;
  page_break: boolean;
  gradebook_section_type_id: number;
  section_id: number;
  level_id: number;
  section_type?: IGradebookSectionType | null;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Planning\Gradebooks\Rubric
 */
export interface IRubric {
  id: number;
  name: string;
  qualifier: string | null;
  description: string;
  not_assessed_text: string | null;
  display_mode: RubricDisplayMode;
  show_scale_description: boolean;
  automatic: boolean;
  special_education: boolean;
  accepts_special_education: boolean;
  active: boolean;
  rubric_type_id: number;
  grade_id: number | null;
  study_plan_stage_id: number;
  created_at?: string | null;
  updated_at?: string | null;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Planning\Gradebooks\RubricScale
 */
export interface IRubricScale {
  id: number;
  name: string;
  description: string;
  order: number;
  file: string | null;
  color: string | null;
  rubric_id: number;
  created_at?: string | null;
  updated_at?: string | null;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Planning\Gradebooks\RubricSection
 */
export interface IRubricSection {
  id: number;
  name: string;
  description: string;
  order: number;
  rubric_id: number;
  evaluator_role_id: number;
  created_at?: string | null;
  updated_at?: string | null;
  evaluator_role?: IRole | null;
  stage_subjects?: IStudyPlanStageSubject[];
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Planning\Gradebooks\RubricSkill
 */
export interface IRubricSkill {
  id: number;
  name: string;
  description: string;
  subtitle: boolean;
  order: number;
  rubric_section_id: number;
  evaluation_source_skill_id: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}
