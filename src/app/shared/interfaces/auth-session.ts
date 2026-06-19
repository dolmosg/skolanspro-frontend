export interface AuthRole {
  id: number;
  name: string;
  translation?: string;
  path?: string;
  help?: string;
  internal?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AuthPerson {
  id?: number;
  name?: string | null;
  lastname?: string | null;
  mothername?: string | null;
  full?: string | null;
  full_name?: string | null;
  picture?: string | null;
  photo?: string | null;
  initials?: string | null;
  [key: string]: unknown;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  active?: number | boolean;
  force_password?: number | boolean;
  email_verified_at?: string | null;
  created_at?: string;
  updated_at?: string;
  role_id?: number;
  actual_role?: number;
  notifications?: number;
  initials?: string | null;
  photo?: string | null;
  person?: AuthPerson | null;
  roles?: AuthRole[];
  role?: AuthRole | null;
}

export interface AuthSession {
  token: string | null;
  tokenType: string | null;
  context: 'central' | 'tenant' | null;
  tenant?: string | null;
  user: AuthUser | null;
}
