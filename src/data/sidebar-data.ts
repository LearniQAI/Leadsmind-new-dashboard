import { SidebarCategory } from "@/interface";

const sidebarData: SidebarCategory[] = [
 {
  id: 1,
  category: "Main",
  items: [
   { id: 1, label: "Dashboard", icon: "icon-house", link: "/dashboard" },
   { id: 2, label: "Tasks", icon: "fa-light fa-circle-check", link: "/tasks" },
   { id: 3, label: "Conversations", icon: "fa-light fa-message", link: "/conversations" },
   { id: 4, label: "Inbox", icon: "fa-light fa-inbox", link: "/inbox" },
  ],
 },
 {
  id: 2,
  category: "Relations",
  items: [
   { id: 5, label: "Contacts", icon: "fa-light fa-users", link: "/contacts" },
   { id: 6, label: "Pipelines", icon: "icon-projects", link: "/pipelines" },
   { id: 7, label: "Proposals", icon: "fa-light fa-file-signature", link: "/proposals" },
   { id: 8, label: "Invoices", icon: "fa-light fa-file-invoice-dollar", link: "/invoices" },
  ],
 },
 {
  id: 3,
  category: "Scheduling",
  items: [
   { id: 9, label: "Calendars", icon: "fa-light fa-calendar-days", link: "/calendar" },
   { id: 10, label: "Waitlists", icon: "fa-light fa-clock-rotate-left", link: "/calendar/waitlist" },
  ],
 },
 {
  id: 4,
  category: "Marketing",
  items: [
   { id: 11, label: "Websites", icon: "fa-light fa-browser", link: "/websites" },
   { id: 12, label: "Funnels", icon: "fa-light fa-filter", link: "/funnels" },
   { id: 13, label: "Campaigns", icon: "fa-light fa-paper-plane", link: "/campaigns" },
   { id: 14, label: "Forms", icon: "icon-document", link: "/forms" },
   { id: 15, label: "Social", icon: "fa-light fa-share-nodes", link: "/social" },
   { id: 16, label: "Reputation", icon: "icon-trophy", link: "/reputation" },
   { id: 17, label: "Ads", icon: "icon-announcement", link: "/ads" },
  ],
 },
 {
  id: 5,
  category: "Commerce",
  items: [
   { id: 18, label: "Products", icon: "fa-light fa-box", link: "/products" },
   { id: 19, label: "Orders", icon: "fa-light fa-bag-shopping", link: "/orders" },
   { id: 20, label: "Expenses", icon: "fa-light fa-receipt", link: "/finance/expenses" },
  ],
 },
 {
  id: 6,
  category: "Business",
  items: [
   { id: 21, label: "Projects", icon: "icon-projects", link: "/projects" },
   { id: 22, label: "Support", icon: "fa-light fa-life-ring", link: "/support" },
   { id: 23, label: "Automations", icon: "fa-light fa-bolt", link: "/automations" },
   { id: 24, label: "Learning", icon: "icon-training", link: "/courses" },
   { id: 25, label: "Certificates", icon: "icon-trophy", link: "/courses/certificates" },
   { id: 26, label: "Community", icon: "fa-light fa-comments", link: "/community/forums" },
   { id: 27, label: "Media Center", icon: "fa-light fa-folder-open", link: "/media" },
  ],
 },
 {
  id: 7,
  category: "Analytics",
  items: [
   { id: 28, label: "Reporting", icon: "fa-sharp fa-regular fa-chart-network", link: "/analytics" },
  ],
 },
 {
  id: 8,
  category: "Account",
  items: [
   { id: 29, label: "Settings", icon: "fa-light fa-gear", link: "/settings" },
  ],
 },
];

export default sidebarData;
