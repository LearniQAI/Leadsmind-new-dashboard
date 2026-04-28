
//Define an interface for the Dashboard sidebar menu
interface SubItem  {
    label: string;
    link?: string;
    subItems?: SubItem[];
  };
  
  interface MenuItem  {
    id: number;
    label: string;
    icon?: string;
    link?: string;
    subItems?: SubItem[];
  };
  
  export interface SidebarCategory {
    id: number;
    category: string;
    items: MenuItem[];
  };