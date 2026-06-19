import type {
  IAddressType,
  ICountry,
  IFamilyStatus,
  IGrade,
  IMailType,
  IPhoneType,
  IStudentStatus,
  IStudentYearStatus,
  ITutorStatus,
  ITutorType,
} from './configuration.interfaces';
import type { IPerson } from './identity.interfaces';

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Administration\Family
 */
export interface IFamily {
  address?: IFamilyAddress | null;
  canceled_at: string | null;
  code: string | null;
  display_name: string;
  email: string | null;
  family_status_id: number;
  full_name: string;
  id: number;
  lastname: string;
  mothername: string | null;
  registered_at: string | null;
  status?: IFamilyStatus | null;
  students?: IStudent[];
  tutors?: IFamilyTutor[];
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Administration\FamilyAddress
 */
export interface IFamilyAddress {
  city: string | null;
  colony: string;
  country?: ICountry | null;
  country_id: number;
  family?: IFamily;
  id: number;
  indoor: string | null;
  municipality: string;
  outdoor: string;
  state: string;
  street: string;
  zip_code: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Administration\FamilyTutor
 */
export interface IFamilyTutor {
  family?: IFamily;
  family_id: number;
  id: number;
  main_contact: boolean;
  order: number;
  person?: IPerson;
  person_id: number;
  tutor_status?: ITutorStatus | null;
  tutor_status_id: number;
  tutor_type?: ITutorType | null;
  tutor_type_id: number;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Administration\PersonAddress
 */
export interface IPersonAddress {
  address_type?: IAddressType | null;
  address_type_id: number;
  city: string;
  colony: string;
  country?: ICountry | null;
  country_id: number;
  id: number;
  indoor: string | null;
  municipality: string;
  name: string | null;
  outdoor: string;
  person?: IPerson;
  person_id: number;
  state: string;
  street: string;
  zip_code: string;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Administration\PersonMail
 */
export interface IPersonMail {
  active: boolean;
  email: string;
  id: number;
  mail_type_id: number;
  person?: IPerson;
  person_id: number;
  type?: IMailType;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Administration\PersonPhone
 */
export interface IPersonPhone {
  country?: ICountry | null;
  country_id: number;
  id: number;
  person?: IPerson;
  person_id: number;
  phone: string;
  phone_type?: IPhoneType | null;
  phone_type_id: number;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Administration\SchoolYear
 */
export interface ISchoolYear {
  current: boolean;
  id: number;
  name: string;
  order: number;
  visible: boolean;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Administration\Section
 */
export interface ISection {
  active: boolean;
  capital: string;
  css_class: string | null;
  description: string | null;
  gender_id: number | null;
  id: number;
  name: string;
  order: number;
  people?: IPerson[];
  translation: string | null;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Administration\Student
 */
export interface IStudent {
  comment: string | null;
  current_year?: IStudentYear | null;
  enrollment: string | null;
  family?: IFamily;
  family_id: number;
  id: number;
  person?: IPerson;
  qr_filename: string | null;
  status?: IStudentStatus | null;
  student_status_id: number;
  unsubscribed_at: string | null;
  years?: IStudentYear[];
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Administration\StudentYear
 */
export interface IStudentYear {
  complements: boolean;
  current: boolean;
  grade?: IGrade;
  grade_id: number;
  id: number;
  school_year?: ISchoolYear;
  school_year_id: number;
  special_education: boolean;
  status?: IStudentYearStatus | null;
  student?: IStudent;
  student_id: number;
  student_year_status_id: number;
}
