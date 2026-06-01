import { AppContextType } from '../app-context-types';

export type NameCasingMode = 'normal' | 'capital' | 'uppercase';

export interface SiteLanguage {
  id: number;
  name: string;
  label: string;
  code: string;
  icon?: string;
  direction: 'ltr' | 'rtl';
  shorthand: string;
  active: number;
  order: number;
}

export interface SiteTheme {
  id: number | null;
  name: string;
  translation: string;
  order: number;
  active: number;
}

export interface SiteStateData {
  context: AppContextType;
  tenant?: string;

  tradename: string;
  title?: string;
  logo: string;
  googlelogin: boolean;

  theme: SiteTheme;
  language: SiteLanguage | null;
  languages: SiteLanguage[];

  nameCasing: NameCasingMode;

  maintenance: string | null;

  message: string;
  messageAuthor?: string | null;
  messageSource?: string | null;
  appVersion: string;
}

export interface SiteStateResponse {
  success: boolean;
  data: SiteStateData;
  message: string;
}