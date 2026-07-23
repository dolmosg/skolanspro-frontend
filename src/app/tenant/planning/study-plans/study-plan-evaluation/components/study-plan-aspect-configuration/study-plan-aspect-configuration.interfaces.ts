export type StudyPlanAspectModeName = 'stage' | 'term' | 'subject' | 'full';

export interface StudyPlanAspectMode {
  id: number;
  name: StudyPlanAspectModeName;
  translation: string;
}

export interface StudyPlanAspectTermOption {
  id: number;
  study_plan_stage_id: number;
  code: string | null;
  name: string;
  alternate_name: string | null;
  order: number;
}

export interface StudyPlanAspectSubject {
  id: number;
  code: string | null;
  name: string;
}

export interface StudyPlanAspectEvaluationType {
  id: number;
  name: string;
  translation: string;
}

export interface StudyPlanAspectStageSubjectOption {
  id: number;
  order: number;
  subject: StudyPlanAspectSubject;
  evaluation_type: StudyPlanAspectEvaluationType;
}

export interface StudyPlanAspectSelectionContextResponse {
  aspect_mode: StudyPlanAspectMode;
  terms: StudyPlanAspectTermOption[];
  subjects: StudyPlanAspectStageSubjectOption[];
}

export interface StudyPlanAspectConfigurationContext {
  study_plan_stage_id: number;
  study_plan_term_id: number | null;
  stage_subject_id: number | null;
}

export interface StudyPlanAspectConfigurationItem {
  id: number;
  name: string;
  description: string | null;
}

export interface StudyPlanConfiguredAspect {
  automatic: boolean;
  weight: string;
  activities: number;
  order: number;
  aspect: StudyPlanAspectConfigurationItem;
  study_plan_term_id?: number;
  stage_subject_id?: number;
}

export interface StudyPlanAspectConfigurationResponse {
  aspect_mode: StudyPlanAspectModeName;
  context: StudyPlanAspectConfigurationContext;
  configured_aspects: StudyPlanConfiguredAspect[];
  available_aspects: StudyPlanAspectConfigurationItem[];
}
