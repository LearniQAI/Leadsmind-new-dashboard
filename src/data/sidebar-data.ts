import { SidebarCategory } from "@/interface";

const sidebarData: SidebarCategory[] = [
 {
  id: 1,
  category: "Main",
  items: [
   { id: 1, label: "Dashboard", icon: "icon-house", link: "/dashboard", permission: "dashboard" },
   { id: 2, label: "Tasks", icon: "fa-light fa-circle-check", link: "/tasks", permission: "dashboard" },
   { id: 3, label: "Inbox", icon: "fa-light fa-inbox", link: "/conversations", permission: "contacts" },
  ],
 },
 {
  id: 2,
  category: "Relations",
  items: [
   { id: 5, label: "Contacts", icon: "fa-light fa-users", link: "/contacts", permission: "contacts" },
   { id: 51, label: "Lead Finder", icon: "fa-light fa-magnifying-glass-location", link: "/lead-finder", permission: "contacts" },
   { id: 6, label: "Pipelines", icon: "icon-projects", link: "/pipelines", permission: "pipelines" },
  ],
 },
 {
  id: 4,
  category: "Marketing",
  items: [
   { id: 14, label: "Forms", icon: "icon-document", link: "/forms", permission: "marketing" },
   { id: 7, label: "Proposals", icon: "fa-light fa-file-signature", link: "/proposals", permission: "proposals" },
   { id: 8, label: "Invoices", icon: "fa-light fa-file-invoice-dollar", link: "/invoices", permission: "invoices" },
  ],
 },
 {
  id: 6,
  category: "Business",
  items: [
   { id: 23, label: "Automations", icon: "fa-light fa-bolt", link: "/automations", permission: "automation" },
  ],
 },
 {
  id: 8,
  category: "Account",
  items: [
   { id: 29, label: "Settings", icon: "fa-light fa-gear", link: "/settings", permission: "settings" },
  ],
 },
];

export default sidebarData;

