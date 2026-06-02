import { SidebarCategory } from "@/interface";

const sidebarData: SidebarCategory[] = [
 {
  id: 1,
  category: "Main",
  items: [
   { id: 1, label: "Dashboard", icon: "icon-house", link: "/dashboard", permission: "dashboard" },
   { id: 2, label: "Tasks", icon: "fa-light fa-circle-check", link: "/tasks", permission: "dashboard" },
   { id: 3, label: "Chat", icon: "fa-light fa-comments", link: "/conversations", permission: "contacts" },
  ],
 },
 {
  id: 2,
  category: "Relations",
  items: [
   { id: 5, label: "Contacts", icon: "fa-light fa-users", link: "/contacts", permission: "contacts" },
   { id: 51, label: "Lead Finder", icon: "fa-light fa-magnifying-glass-location", link: "/lead-finder", permission: "contacts" },
   { id: 6, label: "Pipelines", icon: "icon-projects", link: "/pipelines", permission: "pipelines" },
   { id: 7, label: "Proposals", icon: "fa-light fa-file-signature", link: "/proposals", permission: "proposals" },
   { id: 8, label: "Invoices", icon: "fa-light fa-file-invoice-dollar", link: "/invoices", permission: "invoices" },
   { id: 81, label: "Quotes", icon: "fa-light fa-file-invoice", link: "/quotes", permission: "invoices" },
  ],
 },
 {
  id: 3,
  category: "Scheduling",
  items: [
   { id: 9, label: "Calendars", icon: "fa-light fa-calendar-days", link: "/calendar", permission: "calendar" },
   { id: 10, label: "Waitlists", icon: "fa-light fa-clock-rotate-left", link: "/calendar/waitlist", permission: "calendar" },
  ],
 },
 {
  id: 4,
  category: "Marketing",
  items: [
   { id: 11, label: "Websites", icon: "fa-light fa-browser", link: "/websites", permission: "marketing" },
   { id: 112, label: "Blogs", icon: "fa-light fa-newspaper", link: "/blog/manage", permission: "marketing" },
   { id: 113, label: "Content Studio", icon: "fa-light fa-sparkles", link: "/ai-studio", permission: "marketing" },
   { id: 12, label: "Funnels", icon: "fa-light fa-filter", link: "/funnels", permission: "marketing" },
   { id: 13, label: "Campaigns", icon: "fa-light fa-paper-plane", link: "/campaigns", permission: "marketing" },
   { id: 14, label: "Forms", icon: "icon-document", link: "/forms", permission: "marketing" },
   { id: 15, label: "Social", icon: "fa-light fa-share-nodes", link: "/social", permission: "marketing" },
   { id: 16, label: "Reputation", icon: "icon-trophy", link: "/reputation", permission: "marketing" },
   { id: 17, label: "Ads", icon: "icon-announcement", link: "/ads", permission: "marketing" },
  ],
 },
 {
  id: 5,
  category: "Commerce",
  items: [
   { id: 18, label: "Products", icon: "fa-light fa-box", link: "/products", permission: "commerce" },
   { id: 19, label: "Orders", icon: "fa-light fa-bag-shopping", link: "/orders", permission: "commerce" },
   {
    id: 20,
    label: "Finance",
    icon: "fa-light fa-chart-line",
    link: "/finance",
    permission: "commerce",
    subItems: [
     { label: "Overview", link: "/finance" },
     { label: "Transactions", link: "/finance/transactions" },
     { label: "Reconciliation", link: "/finance/reconciliation" },
     { label: "Connected Accounts", link: "/finance/connected-accounts" },
     { label: "Payment Gateways", link: "/finance/payment-gateways" },
     { label: "Reports", link: "/finance/reports" },
     { label: "Expenses", link: "/finance/expenses" },
    ],
   },
  ],
 },
 {
  id: 6,
  category: "Business",
  items: [
   { id: 21, label: "Projects", icon: "icon-projects", link: "/projects", permission: "business" },
   { id: 22, label: "Support", icon: "fa-light fa-life-ring", link: "/support", permission: "business" },
   { id: 221, label: "Help Center", icon: "fa-light fa-circle-question", link: "/articles", permission: "business" },
   { id: 23, label: "Automations", icon: "fa-light fa-bolt", link: "/automations", permission: "automation" },
   { id: 24, label: "Learning", icon: "icon-training", link: "/courses" },
   { id: 241, label: "Student Portal", icon: "fa-light fa-graduation-cap", link: "/student" },
   { id: 25, label: "Certificates", icon: "icon-trophy", link: "/courses/certificates" },
   { id: 26, label: "Community", icon: "fa-light fa-comments", link: "/community/forums", permission: "business" },
   { id: 27, label: "Media Center", icon: "fa-light fa-folder-open", link: "/media", permission: "business" },
  ],
 },

 {
  id: 8,
  category: "Account",
  items: [
   { id: 29, label: "Settings", icon: "fa-light fa-gear", link: "/settings", permission: "settings" },
   { id: 32, label: "Integrations", icon: "fa-light fa-plug", link: "/settings/integrations-hub", permission: "settings" },
   { id: 33, label: "Developer & API", icon: "fa-light fa-code", link: "/settings/developer", permission: "settings" },
  ],
 },
];

export default sidebarData;
