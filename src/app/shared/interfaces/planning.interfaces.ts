import { IGradebookSectionType } from './configuration.interfaces';

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
