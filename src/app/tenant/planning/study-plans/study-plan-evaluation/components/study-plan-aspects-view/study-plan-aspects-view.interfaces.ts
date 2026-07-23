import type { ScreenChildItem } from '@shared/interfaces/access.interfaces';

/** Payload returned by the StudyPlanAspects authorized-children endpoint. */
export interface StudyPlanAspectChildrenResponse {
  children: ScreenChildItem[];
}
