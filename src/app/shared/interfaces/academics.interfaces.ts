import type { IGrade } from './configuration.interfaces';
import type { ISection } from './administration.interfaces';

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Academics\LearningArea
 */
export interface ILearningArea {
  active: boolean;
  color: string | null;
  id: number;
  name: string;
  order: number;
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Academics\Subject
 */
export interface ISubject {
  active: boolean;
  classification?: ISubjectClassification | null;
  code: string | null;
  css_class: string | null;
  grade?: IGrade | null;
  grade_id: number | null;
  id: number;
  learning_area?: ILearningArea | null;
  learning_area_id: number | null;
  name: string;
  official: boolean;
  order: number;
  section?: ISection | null;
  section_id: number;
  short_name: string | null;
  subject_classification_id: number;
  subject_subcategory_id: number | null;
  subcategory?: ISubjectSubcategory | null;
  weekly_blocks: number;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Academics\SubjectClassification
 */
export interface ISubjectClassification {
  active: boolean;
  color: string | null;
  id: number;
  name: string;
  order: number;
  subcategories?: ISubjectSubcategory[];
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Academics\SubjectSubcategory
 */
export interface ISubjectSubcategory {
  active: boolean;
  classification?: ISubjectClassification | null;
  id: number;
  name: string;
  order: number;
  subject_classification_id: number;
  translation: string;
}
