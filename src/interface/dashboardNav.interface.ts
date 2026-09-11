export interface NavSubItem {
  label: string;
  link: string;
  permission?: string; // optional override; falls back to parent NavItem's permission
}

export interface NavItem {
  id: number;
  label: string;
  icon: string; // FA/icomoon class string, e.g. "fa-light fa-users"
  link?: string; // omitted when the item is purely a subItems container (e.g. Finance)
  permission?: string;
  subItems?: NavSubItem[];
}

export interface NavModule {
  id: string; // stable slug, e.g. "crm-sales" — used for active-state id
  label: string;
  icon: string;
  link?: string; // present for a direct-link module with no sub-nav (e.g. Dashboard, Help Center)
  items?: NavItem[]; // absent for a direct-link module (e.g. Dashboard, Help Center)
  permission?: string;
}
