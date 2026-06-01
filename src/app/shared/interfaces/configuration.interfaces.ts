export interface RoleListItem {
  id: number;
  name: string;
  translation?: string;
  path?: string;
  help?: string;
}

export interface ModuleListItem {
  id: number;
  name: string;
  translation: string;
  priv: boolean | number;
  icon: string;
  order: number;
  context: 'central' | 'tenant' | 'both';
}

export interface ControllerListItem {
  id: number;
  name: string;
  translation: string;
  priv: boolean | number;
  visible: boolean | number;
  icon: string;
  order: number;
  context: 'central' | 'tenant' | 'both';
  parent_id: number | null;
  module_id: number;
}

export interface ActionListItem {
  id: number;
  name: string;
  translation: string;
  icon: string;
  color: string;
  priv: boolean | number;
  order: number;
  controller_id: number;
}

/**
 * Represents a generic option returned by backend to configure UI actions
 * and navigation (buttons, drilldowns, etc.) for a screen.
 */
export interface ScreenOptionItem {
  id: number;
  name: string;
  translation: string;
  icon: string;
  color: 'primary' | 'secondary' | 'ghost' | 'danger';

  // Optional relationships depending on option type
  controller_id?: number;
  parent_id?: number | null;
  module_id?: number;

  // Behavior flags
  has_children?: boolean;
}

export interface ScreenChildItem {
  id: number;
  name: string;
  route: string;
  translation: string;
  icon: string | null;
  color: 'primary' | 'secondary' | 'ghost' | 'danger';
  order: number | null;
}