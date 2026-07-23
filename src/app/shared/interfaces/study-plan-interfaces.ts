import { ISubject } from './academics.interfaces';
import { ISchoolYear, ISection } from './administration.interfaces';
import type { IDay } from './central.interfaces';
import type { IPerson } from './identity.interfaces';
import type {
  IAspectMode,
  IAttendanceCalculation,
  IAttendanceType,
  IBlockType,
  ICommentType,
  IDescriptiveSheetType,
  IGender,
  IGrade,
  IGradePolicy,
  IGradingScale,
  IGroupType,
  ILevel,
  IScheduleType,
  IStudyPlanStructure,
  ITermStatus,
  ITermType,
} from './configuration.interfaces';

export type StudyPlanDecimal = string | number;

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Planning\StudyPlans\StudyPlan
 */
export interface IStudyPlan {
  id: number;
  name: string;
  description: string | null;
  start: string;
  end: string;
  level_id: number;
  school_year_id: number;
  section_id: number;
  study_plan_structure_id: number;
  schedule_type_id: number;
  created_at?: string | null;
  updated_at?: string | null;
  level?: ILevel | null;
  school_year?: ISchoolYear | null;
  section?: ISection | null;
  structure?: IStudyPlanStructure | null;
  stages?: IStudyPlanStage[];
  aspects?: IStudyPlanAspect[];
  grading_settings?: IStudyPlanGradingSetting | null;
  attendance_settings?: IStudyPlanAttendanceSetting | null;
  lms_settings?: IStudyPlanLmsSetting | null;
  programming_setting?: IStudyPlanProgrammingSetting | null;
  schedule_type?: IScheduleType | null;
  schedule_structures?: IStudyPlanScheduleStructure[];
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Planning\StudyPlans\StudyPlanAspect
 */
export interface IStudyPlanAspect {
  id: number;
  study_plan_id: number;
  name: string;
  description: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  study_plan?: IStudyPlan | null;
  programming_setting?: IStudyPlanProgrammingSetting | null;
}

/** Stage projection returned by StudyPlanEvaluations in summaries.aspects. */
export interface IStudyPlanAspectsStageSummary {
  id: number;
  name: string;
  total_subjects: number;
  configured_subjects: number;
  unused_aspects: number;
  completion_percent: number;
  completion_color: string;
}

/** Aspect summary contract returned by StudyPlanEvaluations. */
export interface IStudyPlanAspectsSummary {
  total_aspects: number;
  stages: IStudyPlanAspectsStageSummary[];
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Planning\StudyPlans\StudyPlanProgrammingSetting
 */
export interface IStudyPlanProgrammingSetting {
  study_plan_id: number;
  aspect_id: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  study_plan?: IStudyPlan | null;
  aspect?: IStudyPlanAspect | null;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Planning\StudyPlans\StudyPlanScheduleStructure
 */
export interface IStudyPlanScheduleStructure {
  id: number;
  study_plan_id: number;
  name: string;
  active: boolean;
  order: number;
  created_at?: string | null;
  updated_at?: string | null;
  study_plan?: IStudyPlan | null;
  segments?: IStudyPlanScheduleSegment[];
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Planning\StudyPlans\StudyPlanScheduleSegment
 */
export interface IStudyPlanScheduleSegment {
  id: number | null;
  study_plan_schedule_structure_id: number;
  gender_id: number | null;
  name: string;
  active: boolean;
  order: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  /**
   * Total number of schedule blocks in the segment.
   */
  blocks_count?: number;
  /**
   * Number of lesson blocks in the segment.
   */
  lessons_count?: number;
  /**
   * Number of break blocks in the segment.
   */
  breaks_count?: number;
  schedule_structure?: IStudyPlanScheduleStructure | null;
  gender?: IGender | null;
  segment_days?: IStudyPlanScheduleSegmentDay[];
  blocks?: IStudyPlanScheduleBlock[];
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Planning\StudyPlans\StudyPlanScheduleSegmentDay
 */
export interface IStudyPlanScheduleSegmentDay {
  id: number | null;
  study_plan_schedule_segment_id: number | null;
  day_id: number;
  created_at?: string | null;
  updated_at?: string | null;
  segment?: IStudyPlanScheduleSegment | null;
  day?: IDay | null;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Planning\StudyPlans\StudyPlanScheduleBlock
 */
export interface IStudyPlanScheduleBlock {
  id: number;
  study_plan_schedule_segment_id: number;
  block_type_id: number;
  code: string;
  name: string;
  start: string;
  end: string;
  order: number;
  duration: number;
  created_at?: string | null;
  updated_at?: string | null;
  segment?: IStudyPlanScheduleSegment | null;
  type?: IBlockType | null;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Planning\StudyPlans\StudyPlanScheduleVariant
 */
export interface IStudyPlanScheduleVariant {
  id: number;
  study_plan_id: number;
  code: string;
  name: string;
  created_at?: string | null;
  updated_at?: string | null;
  study_plan?: IStudyPlan | null;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Planning\StudyPlans\StudyPlanGradingSetting
 */
export interface IStudyPlanGradingSetting {
  id: number;
  study_plan_id: number;
  grading_scale_id: number;
  grade_policy_id: number;
  aspect_mode_id: number;
  comment_type_id: number;
  decimals: number;
  class_percent: StudyPlanDecimal;
  exam_percent: StudyPlanDecimal;
  exemptions: boolean;
  exemption_average: StudyPlanDecimal | null;
  exemption_percent: StudyPlanDecimal | null;
  created_at?: string | null;
  updated_at?: string | null;
  study_plan?: IStudyPlan | null;
  grading_scale?: IGradingScale | null;
  grade_policy?: IGradePolicy | null;
  aspect_mode?: IAspectMode | null;
  comment_type?: ICommentType | null;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Planning\StudyPlans\StudyPlanAttendanceSetting
 */
export interface IStudyPlanAttendanceSetting {
  id: number;
  study_plan_id: number;
  attendance_type_id: number;
  attendance_calculation_id: number;
  attendance_details: boolean;
  delay_absence_ratio: number;
  attendance_delay: number;
  attendance_percent: StudyPlanDecimal;
  created_at?: string | null;
  updated_at?: string | null;
  study_plan?: IStudyPlan | null;
  attendance_type?: IAttendanceType | null;
  attendance_calculation?: IAttendanceCalculation | null;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Planning\StudyPlans\StudyPlanLmsSetting
 */
export interface IStudyPlanLmsSetting {
  id: number;
  study_plan_id: number;
  enabled: boolean;
  skills_scale_id: number | null;
  performance_scale_id: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  study_plan?: IStudyPlan | null;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Planning\StudyPlans\StudyPlanStage
 */
export interface IStudyPlanStage {
  id: number;
  study_plan_id: number;
  name: string;
  start_date: string;
  end_date: string;
  order: number;
  created_at?: string | null;
  updated_at?: string | null;
  has_crossovers: boolean;
  study_plan?: IStudyPlan | null;
  terms?: IStudyPlanTerm[];
  subjects?: IStudyPlanStageSubject[];
  integrations?: ISubjectIntegration[];
  groups?: IStudyPlanStageGroup[];
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Planning\StudyPlans\StudyPlanTerm
 */
export interface IStudyPlanTerm {
  id: number;
  study_plan_stage_id: number;
  code: string;
  name: string;
  alternate_name: string | null;
  start_date: string;
  end_date: string;
  review_date: string;
  exemption: boolean;
  attendance: boolean;
  comments: boolean;
  term_status_id: number;
  term_type_id: number;
  descriptive_sheet_type_id: number | null;
  order: number;
  created_at?: string | null;
  updated_at?: string | null;
  stage?: IStudyPlanStage | null;
  status?: ITermStatus | null;
  type?: ITermType | null;
  descriptive_sheet_type?: IDescriptiveSheetType | null;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Planning\StudyPlans\StudyPlanStageGroup
 */
export type StudyPlanStageGroupDeleteMode =
  | 'normal'
  | 'force_empty_assignments'
  | 'blocked';

export interface IStudyPlanStageGroupDelete {
  mode: StudyPlanStageGroupDeleteMode;
  assignments_count: number;
}

export interface IStudyPlanStageGroup {
  id: number;
  study_plan_stage_id: number;
  parent_id: number | null;
  group_type_id: number;
  grade_id: number | null;
  stage_subject_id: number | null;
  gender_id: number | null;
  code: string;
  name: string;
  quota: number;
  color: string | null;
  active: boolean;
  order: number;
  created_at?: string | null;
  updated_at?: string | null;
  delete?: IStudyPlanStageGroupDelete;
  stage?: IStudyPlanStage | null;
  parent?: IStudyPlanStageGroup | null;
  children?: IStudyPlanStageGroup[];
  type?: IGroupType | null;
  grade?: IGrade | null;
  subject?: IStudyPlanStageSubject | null;
  gender?: IGender | null;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Planning\StudyPlans\StudyPlanStageSubjectGroup
 */
export interface IStudyPlanStageSubjectGroup {
  id: number;
  study_plan_stage_id: number;
  stage_subject_id: number;
  study_plan_stage_group_id: number;
  grade_capture_enabled: boolean;
  report_card_official_override: boolean | null;
  comment_group_id: number | null;
  active: boolean;
  order: number;
  created_at?: string | null;
  updated_at?: string | null;
  stage?: IStudyPlanStage | null;
  stage_subject?: IStudyPlanStageSubject | null;
  stage_group?: IStudyPlanStageGroup | null;
  blocks?: IStudyPlanStageSubjectGroupBlock[];
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Planning\StudyPlans\StudyPlanStageSubjectGroupBlock
 */
export interface IStudyPlanStageSubjectGroupBlock {
  id: number;
  study_plan_stage_subject_group_id: number;
  study_plan_schedule_block_id: number;
  day_id: number;
  study_plan_schedule_variant_id: number;
  study_plan_stage_subject_group_team_id: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  subject_group?: IStudyPlanStageSubjectGroup | null;
  schedule_block?: IStudyPlanScheduleBlock | null;
  schedule_variant?: IStudyPlanScheduleVariant | null;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Planning\StudyPlans\StageSubject
 */
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
  created_at?: string | null;
  updated_at?: string | null;
  is_crossover?: boolean;
  study_plan_stage?: IStudyPlanStage | null;
  subject?: ISubject | null;
  grade?: IGrade | null;
  coordinators?: IPerson[];
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Planning\StudyPlans\SubjectIntegration
 */
export interface ISubjectIntegration {
  id: number;
  study_plan_stage_id: number;
  code: string;
  name: string;
  monogram: string;
  active: boolean;
  order: number;
  created_at?: string | null;
  updated_at?: string | null;
  stage?: IStudyPlanStage | null;
  items?: ISubjectIntegrationItem[];
  items_count?: number;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Planning\StudyPlans\SubjectIntegrationItem
 */
export interface ISubjectIntegrationItem {
  id: number;
  subject_integration_id: number;
  stage_subject_id: number;
  order: number;
  final_weight: StudyPlanDecimal;
  failure_blocking: boolean;
  enrollment_dependent: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  integration?: ISubjectIntegration | null;
  stage_subject?: IStudyPlanStageSubject | null;
  term_weights?: ISubjectIntegrationItemTermWeight[];
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Planning\StudyPlans\SubjectIntegrationItemTermWeight
 */
export interface ISubjectIntegrationItemTermWeight {
  id: number;
  subject_integration_item_id: number;
  study_plan_term_id: number;
  weight: StudyPlanDecimal;
  created_at?: string | null;
  updated_at?: string | null;
  item?: ISubjectIntegrationItem | null;
  study_plan_term?: IStudyPlanTerm | null;
}
