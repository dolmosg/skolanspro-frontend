import type { IDay } from './central.interfaces';

/**
 * Shared Configuration domain interfaces.
 *
 * These interfaces represent the functional contracts used by the frontend,
 * independent of whether the underlying Laravel model belongs to the
 * Central or Tenant context.
 */

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\Action
 */
export interface IAction {
  color: string | null;
  controller?: IController | null;
  controller_id: number;
  icon: string | null;
  id: number;
  name: string | null;
  order: number;
  priv: boolean;
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\AcademicCatalogs\ActivityType
 */
export interface IActivityType {
  active: boolean;
  configurable: boolean;
  gradeable: boolean;
  icon: string | null;
  id: number;
  name: string | null;
  order: number;
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\AddressType
 */
export interface IAddressType {
  description: string | null;
  id: number;
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\AcademicCatalogs\AspectMode
 */
export interface IAspectMode {
  active: boolean;
  id: number;
  name: string | null;
  order: number;
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\AcademicCatalogs\AttendanceCalculation
 */
export interface IAttendanceCalculation {
  active: boolean;
  help_translation: string;
  id: number;
  name: string | null;
  order: number;
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\AcademicCatalogs\AttendanceType
 */
export interface IAttendanceType {
  active: boolean;
  help_translation: string;
  id: number;
  name: string | null;
  order: number;
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\AcademicCatalogs\BlockType
 *
 * These models share the same serialized contract.
 */
export interface IBlockType {
  active: boolean;
  help_translation: string;
  id: number;
  name: string | null;
  order: number;
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\BloodType
 */
export interface IBloodType {
  id: number;
  name: string | null;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Configuration\Campus
 */
export interface ICampus {
  active: boolean;
  city: string | null;
  colony: string | null;
  css_class: string | null;
  description: string | null;
  id: number;
  indoor: string | null;
  levels?: ILevel[];
  municipality: string | null;
  name: string | null;
  order: number;
  outdoor: string | null;
  state: string | null;
  street: string | null;
  translation: string;
  zip_code: string | null;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\CentralCatalogModel
 */
export interface ICatalogModel {
  active: boolean;
  help_translation: string;
  id: number;
  name: string | null;
  order: number;
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\AcademicCatalogs\CommentType
 */
export interface ICommentType {
  active: boolean;
  help_translation: string;
  id: number;
  name: string | null;
  order: number;
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\CommunityCatalog
 */
export interface ICommunityCatalog {
  active: boolean;
  css_class: string | null;
  id: number;
  name: string | null;
  order: number;
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\Controller
 */
export interface IController {
  actions?: IAction[];
  children?: IController[];
  context: string | null;
  has_children: boolean;
  icon: string | null;
  id: number;
  module?: IModule | null;
  module_id: number;
  name: string | null;
  order: number;
  parent?: IController | null;
  parent_id: number | null;
  priv: boolean;
  translation: string;
  visible: boolean;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\Country
 */
export interface ICountry {
  id: number;
  iso_code: string | null;
  language: string | null;
  name: string | null;
  phone_code: string | null;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\AcademicCatalogs\DescriptiveSheetType
 */
export interface IDescriptiveSheetType {
  active: boolean;
  help_translation: string;
  id: number;
  name: string | null;
  order: number;
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\AcademicCatalogs\DiagnosticType
 */
export interface IDiagnosticType {
  active: boolean;
  help_translation: string;
  id: number;
  name: string | null;
  order: number;
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Configuration\DirectType
 */
export interface IDirectType {
  description: string | null;
  id: number;
  name: string | null;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\AcademicCatalogs\EvaluationType
 */
export interface IEvaluationType {
  active: boolean;
  help_translation: string;
  id: number;
  name: string | null;
  order: number;
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\FamilyStatus
 */
export interface IFamilyStatus {
  active: boolean;
  help_translation: string;
  id: number;
  name: string | null;
  order: number;
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\AcademicCatalogs\FeedbackType
 */
export interface IFeedbackType {
  active: boolean;
  help_translation: string;
  id: number;
  name: string | null;
  order: number;
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\Gender
 */
export interface IGender {
  icon: string | null;
  id: number;
  name: string | null;
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Configuration\Grade
 */
export interface IGrade {
  active: boolean;
  description: string | null;
  id: number;
  level?: ILevel | null;
  level_id: number;
  name: string | null;
  order: number;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\AcademicCatalogs\GradebookAction
 */
export interface IGradebookAction {
  active: boolean;
  color: string | null;
  icon: string | null;
  id: number;
  name: string | null;
  order: number;
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\AcademicCatalogs\GradebookOption
 */
export interface IGradebookOption {
  active: boolean;
  help_translation: string;
  id: number;
  name: string | null;
  order: number;
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\AcademicCatalogs\GradebookSectionType
 */
export interface IGradebookSectionType {
  active: boolean;
  configurable: boolean;
  id: number;
  name: string | null;
  order: number;
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\AcademicCatalogs\GradebookType
 */
export interface IGradebookType {
  actions?: IGradebookAction[];
  active: boolean;
  aspects: boolean;
  id: number;
  integrations: boolean;
  name: string | null;
  options?: IGradebookOption[];
  order: number;
  rubrics: boolean;
  sections: boolean;
  subjects: boolean;
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * - App\Models\Central\Configuration\AcademicCatalogs\GradebookTypeGradebookAction
 * - App\Models\Tenant\Configuration\AcademicCatalogs\GradebookTypeGradebookAction
 */
export interface IGradebookTypeGradebookAction {
  action?: IGradebookAction | null;
  active: boolean;
  gradebook_action_id: number;
  gradebook_type_id: number;
  id: number;
  order: number;
}

/**
 * Represents the JSON contract of:
 *
 * - App\Models\Central\Configuration\AcademicCatalogs\GradebookTypeGradebookOption
 * - App\Models\Tenant\Configuration\AcademicCatalogs\GradebookTypeGradebookOption
 */
export interface IGradebookTypeGradebookOption {
  option?: IGradebookOption | null;
  active: boolean;
  gradebook_option_id: number;
  gradebook_type_id: number;
  id: number;
  order: number;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Features\GradePolicies\GradePolicy
 */
export interface IGradePolicy {
  active: boolean;
  configurable: boolean;
  help_translation: string;
  id: number;
  name: string | null;
  order: number;
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * - App\Models\Central\Features\GradePolicies\GradePolicyItem
 * - App\Models\Tenant\Features\GradePolicies\GradePolicyItem
 *
 * These models share the same serialized contract.
 */
export interface IGradePolicyItem {
  code: string;
  grade_policy?: IGradePolicy | null;
  grade_policy_id: number;
  id: number;
  name: string;
  order: number;
  threshold: number;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\AcademicCatalogs\GradingScale
 */
export interface IGradingScale {
  active: boolean;
  id: number;
  maximum: number;
  minimum: number;
  name: string | null;
  order: number;
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\AcademicCatalogs\GroupType
 */
export interface IGroupType {
  active: boolean;
  id: number;
  name: string | null;
  order: number;
  requires_subject: boolean;
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\InvoiceUse
 */
export interface IInvoiceUse {
  code: string | null;
  id: number;
  name: string | null;
  tin_types?: ITinType[];
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\Language
 */
export interface ILanguage {
  active: boolean;
  code: string | null;
  direction: string | null;
  id: number;
  label: string | null;
  name: string | null;
  order: number;
  shorthand: string | null;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Configuration\Level
 */
export interface ILevel {
  billing: string | null;
  css_class: string | null;
  description: string | null;
  grades?: IGrade[];
  id: number;
  name: string | null;
  order: number;
  organization_logo?: IOrganizationLogo | null;
  organization_logo_id: number | null;
  registration: string | null;
  revoe: string | null;
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\MailType
 */
export interface IMailType {
  description: string | null;
  id: number;
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\MaritalStatus
 */
export interface IMaritalStatus {
  id: number;
  name: string | null;
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\Module
 */
export interface IModule {
  context: string | null;
  controllers?: IController[];
  icon: string | null;
  id: number;
  name: string | null;
  order: number;
  priv: boolean;
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\NameCasing
 */
export interface INameCasing {
  id: number;
  name: string | null;
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Configuration\OrganizationLogo
 */
export interface IOrganizationLogo {
  active: boolean;
  default: boolean;
  file: string | null;
  id: number;
  levels?: ILevel[];
  logo: string | null;
  name: string | null;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\OrganizationTheme
 */
export interface IOrganizationTheme {
  active: boolean;
  id: number;
  name: string | null;
  order: number;
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\PasswordType
 */
export interface IPasswordType {
  id: number;
  name: string | null;
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Configuration\PersonField
 */
export interface IPersonField {
  context: string | null;
  id: number;
  name: string | null;
  order: number;
  protected: boolean;
  required: boolean;
  translation: string;
  visible: boolean;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\PhoneType
 */
export interface IPhoneType {
  description: string | null;
  id: number;
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\PostalCode
 */
export interface IPostalCode {
  active: boolean;
  city: string | null;
  id: number;
  municipality: string | null;
  postal_code: string | null;
  settlement: string | null;
  settlement_type: string | null;
  state: string | null;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\AcademicCatalogs\ProjectType
 */
export interface IProjectType {
  active: boolean;
  help_translation: string;
  id: number;
  name: string | null;
  order: number;
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\AcademicCatalogs\QuestionInputType
 */
export interface IQuestionInputType {
  active: boolean;
  component: string | null;
  id: number;
  name: string | null;
  order: number;
  question_types?: IQuestionType[];
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\AcademicCatalogs\QuestionType
 */
export interface IQuestionType {
  active: boolean;
  id: number;
  input_types?: IQuestionInputType[];
  name: string | null;
  order: number;
  show_instructions: boolean;
  show_question: boolean;
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\AcademicCatalogs\RubricType
 */
export interface IRubricType {
  active: boolean;
  help_translation: string;
  id: number;
  name: string | null;
  order: number;
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\AcademicCatalogs\ScheduleType
 */
export interface IScheduleType {
  active: boolean;
  help_translation: string;
  id: number;
  name: string | null;
  order: number;
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\StudentStatus
 */
export interface IStudentStatus {
  active: boolean;
  help_translation: string;
  id: number;
  name: string | null;
  order: number;
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\StudentYearStatus
 */
export interface IStudentYearStatus {
  active: boolean;
  help_translation: string;
  id: number;
  name: string | null;
  order: number;
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\AcademicCatalogs\StudyPlanStructure
 */
export interface IStudyPlanStructure {
  active: boolean;
  id: number;
  name: string | null;
  order: number;
  stage_name: string | null;
  stages: number;
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\AcademicCatalogs\SubjectType
 */
export interface ISubjectType {
  active: boolean;
  automatic: boolean;
  can_create: boolean;
  can_remove: boolean;
  help_translation: string;
  id: number;
  name: string | null;
  order: number;
  searchable: boolean;
  translation: string;
  uses_teams: boolean;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\SupportType
 */
export interface ISupportType {
  id: number;
  name: string | null;
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\AcademicCatalogs\SurveyType
 */
export interface ISurveyType {
  active: boolean;
  help_translation: string;
  id: number;
  name: string | null;
  order: number;
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\TaxRegime
 */
export interface ITaxRegime {
  code: string | null;
  id: number;
  name: string | null;
  tin_types?: ITinType[];
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\TenantStatus
 */
export interface ITenantStatus {
  active: boolean;
  color: string | null;
  id: number;
  name: string | null;
  order: number;
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\AcademicCatalogs\TermStatus
 */
export interface ITermStatus {
  active: boolean;
  css_class: string | null;
  help_translation: string;
  id: number;
  name: string | null;
  order: number;
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\AcademicCatalogs\TermType
 */
export interface ITermType {
  active: boolean;
  help_translation: string;
  id: number;
  name: string | null;
  order: number;
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\TinType
 */
export interface ITinType {
  country?: ICountry | null;
  country_id: number;
  id: number;
  name: string | null;
  translation: string;
  validation: string | null;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\TutorStatus
 */
export interface ITutorStatus {
  active: boolean;
  help_translation: string;
  id: number;
  name: string | null;
  order: number;
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Central\Configuration\TutorType
 */
export interface ITutorType {
  icon: string | null;
  id: number;
  name: string | null;
  translation: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Configuration\GeneralConfiguration\WorkingDay
 */
export interface IWorkingDay {
  active: boolean;
  day?: IDay | null;
  day_id: number;
  id: number;
  order: number;
}
