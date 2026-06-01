export interface SidebarNavItem {
  id: string;
  labelKey: string;
  icon?: string;
  route?: string;
  children?: SidebarNavItem[];
  expanded?: boolean;
  badge?: string | number;
}