import type { ILevel } from './configuration.interfaces';
import type {
  IPersonAddress,
  IPersonMail,
  IPersonPhone,
  ISection,
} from './administration.interfaces';

export interface IPersonAge {
  months: number;
  years: number;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\Person
 */
export interface IPerson {
  addresses?: IPersonAddress[];
  age: IPersonAge | null;
  birthdate: string | null;
  birthplace: string | null;
  blood_type_id: number | null;
  citizenship: string | null;
  context: string;
  degree: string | null;
  degree_title: boolean | null;
  direct: boolean;
  direct_type_id: number | null;
  full: string;
  full_name: string;
  gender_id: number;
  id: number;
  idn: string | null;
  initials: string;
  job_description: string | null;
  lastname: string;
  levels?: ILevel[];
  mails?: IPersonMail[];
  marital_status_id: number | null;
  mothername: string | null;
  name: string;
  occupation: string | null;
  phones?: IPersonPhone[];
  photo: string;
  picture: string | null;
  religion: string | null;
  sections?: ISection[];
  tin: string | null;
  translation: string | null;
  user?: IUser | null;
}

/**

 * Represents the JSON contract of:
 *
 * - App\Models\Central\Configuration\Role
 * - App\Models\Tenant\Role
 *
 * These models share the same serialized contract.
 */
export interface IRole {
  help: string | null;
  id: number;
  internal: boolean;
  name: string;
  path: string | null;
  translation: string | null;
}

/**
 * Represents the JSON contract of:
 *
 * App\Models\Tenant\User
 */
export interface IUser {
  active: boolean;
  actual_role: number | null;
  email: string;
  email_verified_at: string | null;
  force_password: boolean;
  id: number;
  notifications: boolean;
  person?: IPerson;
  role?: IRole;
  role_id: number;
  roles?: IRole[];
}
