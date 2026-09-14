import type { IGradebookContentType, IGradebookType } from '@shared/interfaces/configuration.interfaces';
import type { IGradebook } from '@shared/interfaces/study-plan-interfaces';

export type StudyPlanReportCardGradebookTypeDto = Pick<
  IGradebookType,
  'id' | 'name' | 'translation'
> & {
  content_types: Pick<IGradebookContentType, 'id' | 'name' | 'translation'>[];
};

export type StudyPlanReportCardItemDto = Pick<
  IGradebook,
  | 'id'
  | 'name'
  | 'translation'
  | 'order'
  | 'gradebook_type_id'
  | 'gradebook_report_id'
  | 'academic_tutor_id'
  | 'gradebook_attendance_id'
  | 'academy_id'
  | 'comment_language_id'
> & {
  gradebook_type: StudyPlanReportCardGradebookTypeDto | null;
};
