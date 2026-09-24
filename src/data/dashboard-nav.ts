import { NavModule } from "@/interface";

// Each top-level entry's `module` is the permission that gates the whole section and every
// page under it. The Team invite / edit-member modals render THIS array as their "Module
// permissions" list, so adding a section here adds its checkbox automatically. See
// src/lib/permissions/modules.ts (and add the module's tables to the RLS migration).
const dashboardNav: NavModule[] = [
  {
    id: "dashboard",
    module: "dashboard",
    label: "Dashboard",
    icon: "fa-light fa-house",
    link: "/dashboard",
  },
  {
    id: "crm-sales",
    module: "crm",
    label: "CRM & Sales",
    icon: "fa-light fa-users",
    items: [
      { id: 5, label: "Contacts", icon: "fa-light fa-users", link: "/contacts" },
      { id: 52, label: "Tags", icon: "fa-light fa-tags", link: "/contacts/tags" },
      { id: 51, label: "Lead Finder", icon: "fa-light fa-magnifying-glass-location", link: "/lead-finder" },
      { id: 155, label: "Territory Map", icon: "fa-light fa-map-location-dot", link: "/lead-finder/map" },
      { id: 6, label: "Pipelines", icon: "icon-projects", link: "/pipelines" },
      { id: 81, label: "Quotes", icon: "fa-light fa-file-invoice", link: "/quotes" },
      { id: 2, label: "Tasks", icon: "fa-light fa-circle-check", link: "/tasks" },
      { id: 21, label: "Projects", icon: "icon-projects", link: "/projects" },
      { id: 23, label: "Automations", icon: "fa-light fa-bolt", link: "/automations" },
    ],
  },
  {
    id: "marketing",
    module: "marketing",
    label: "Marketing",
    icon: "fa-light fa-bullhorn",
    items: [
      { id: 13, label: "Campaigns", icon: "fa-light fa-paper-plane", link: "/campaigns" },
      { id: 115, label: "Segments", icon: "fa-light fa-users-rectangle", link: "/segments" },
      { id: 114, label: "Email Sequences", icon: "fa-light fa-inbox-out", link: "/sequences" },
      { id: 116, label: "Bulk SMS", icon: "fa-light fa-comment-sms", link: "/sms" },
      { id: 117, label: "WhatsApp Broadcasts", icon: "fa-brands fa-whatsapp", link: "/whatsapp-broadcasts" },
      { id: 12, label: "Funnels", icon: "fa-light fa-filter", link: "/funnels" },
      { id: 14, label: "Forms", icon: "icon-document", link: "/forms" },
      { id: 17, label: "Ads", icon: "icon-announcement", link: "/ads" },
      { id: 113, label: "AI Studio", icon: "fa-light fa-sparkles", link: "/ai-studio" },
      { id: 118, label: "Content Studio", icon: "fa-light fa-pen-nib", link: "/content-studio" },
      { id: 16, label: "Reputation", icon: "icon-trophy", link: "/reputation" },
      { id: 11, label: "Websites", icon: "fa-light fa-browser", link: "/websites" },
      { id: 112, label: "Blogs", icon: "fa-light fa-newspaper", link: "/blog/manage" },
    ],
  },
  {
    id: "social",
    module: "social",
    label: "Social",
    icon: "fa-light fa-share-nodes",
    items: [
      { id: 150, label: "Composer", icon: "fa-light fa-pen-to-square", link: "/social" },
      { id: 151, label: "Connections", icon: "fa-light fa-plug", link: "/social/connections" },
      { id: 152, label: "Calendar", icon: "fa-light fa-calendar-days", link: "/social/calendar" },
      { id: 153, label: "Inbox", icon: "fa-light fa-inbox", link: "/social/inbox" },
      { id: 154, label: "Analytics", icon: "fa-light fa-chart-line", link: "/social/analytics" },
    ],
  },
  {
    // Flat list, no inner accordion (same treatment as HR & Payroll above). The old
    // nested "Finance" subItems container has been dissolved -- every page links
    // directly and is always visible once the section is open, no expand/collapse.
    id: "finance-accounting",
    module: "finance",
    label: "Finance & Accounting",
    icon: "fa-light fa-chart-line",
    items: [
      { id: 20, label: "Overview", icon: "fa-light fa-chart-line", link: "/finance" },
      { id: 201, label: "Revenue Forecast", icon: "fa-light fa-chart-mixed", link: "/finance/revenue-forecast" },
      { id: 202, label: "Transactions", icon: "fa-light fa-arrow-right-arrow-left", link: "/finance/transactions" },
      { id: 203, label: "Reconciliation", icon: "fa-light fa-scale-balanced", link: "/finance/reconciliation" },
      // Invoices / Credit Notes / Retainers sit next to Reconciliation -- they're the
      // billing-document side of the same money flow (an invoice gets reconciled, a
      // credit note reverses one, a retainer draws down against them).
      { id: 8, label: "Invoices", icon: "fa-light fa-file-invoice-dollar", link: "/invoices" },
      { id: 83, label: "Credit Notes", icon: "fa-light fa-file-minus", link: "/finance/credit-notes" },
      { id: 84, label: "Retainers", icon: "fa-light fa-wallet", link: "/finance/retainers" },
      { id: 204, label: "Connected Accounts", icon: "fa-light fa-building-columns", link: "/finance/connected-accounts" },
      { id: 205, label: "Payment Gateways", icon: "fa-light fa-credit-card", link: "/finance/payment-gateways" },
      { id: 85, label: "Chart of Accounts", icon: "fa-light fa-landmark", link: "/finance/chart-of-accounts" },
      { id: 206, label: "Expenses", icon: "fa-light fa-receipt", link: "/finance/expenses" },
      { id: 207, label: "Reports", icon: "fa-light fa-chart-pie", link: "/finance/reports" },
      { id: 82, label: "Compliance Hub", icon: "fa-light fa-shield-halved", link: "/admin/compliance" },
    ],
  },
  {
    id: "commerce-ops",
    module: "commerce",
    label: "Commerce & Ops",
    icon: "fa-light fa-box",
    items: [
      { id: 18, label: "Products", icon: "fa-light fa-box", link: "/products" },
      { id: 19, label: "Orders", icon: "fa-light fa-bag-shopping", link: "/orders" },
      { id: 191, label: "Shipments", icon: "fa-light fa-truck", link: "/shipments" },
      {
        id: 192,
        label: "Affiliates",
        icon: "fa-light fa-handshake",
        link: "/affiliates",
        subItems: [
          { label: "Management", link: "/affiliates" },
          { label: "Affiliate Portal", link: "/affiliate-portal" },
          { label: "Program Marketplace", link: "/affiliate-marketplace" },
        ],
      },
      { id: 31, label: "Inventory", icon: "fa-light fa-boxes-stacked", link: "/inventory" },
    ],
  },
  {
    // Flat list, no accordion (same treatment as HR & Payroll / Finance & Accounting) --
    // every item links directly and is always visible once the section is open. Promoted
    // out of "Commerce & Ops", where Calendars / Waitlists / Instant Meet sat beside the
    // genuine e-commerce items (Products, Orders, Shipments, Affiliates, Inventory) purely
    // by historical accident -- scheduling isn't commerce. All keep their real, unchanged routes (/calendar, /calendar/waitlist,
    // /calendar/instant-meet); this is a nav-location move only, no route or page change.
    id: "calendar-meetings",
    module: "calendar",
    label: "Calendar & Meetings",
    icon: "fa-light fa-calendar-days",
    items: [
      { id: 9, label: "Booking Pages", icon: "fa-light fa-calendar-days", link: "/calendar" },
      { id: 10, label: "Waitlists", icon: "fa-light fa-clock-rotate-left", link: "/calendar/waitlist" },
      { id: 101, label: "Instant Meet", icon: "fa-light fa-video", link: "/calendar/instant-meet" },
      { id: 305, label: "Availability", icon: "fa-light fa-clock", link: "/calendar/availability" },
    ],
  },
  {
    // Flat list, no accordion (deliberately unlike Finance/Affiliates below, which keep
    // their real subItems-container pattern) -- each item links directly and is always
    // visible, no expand/collapse. Role gating (Employees is HR-role-restricted) moved
    // from isSubItemAllowed to isItemAllowed in filterNavByPermissions.ts to match.
    id: "hr-payroll",
    module: "hr",
    label: "HR & Payroll",
    icon: "fa-light fa-users-gear",
    // Not a "direct link" module (NavRailModule only treats `link` as a direct link
    // when `items` is absent) -- this exists solely so /hr (the overview page, reached
    // via each sub-page's "Overview" link, not a distinct sidebar entry) still resolves
    // to this module for active-state highlighting.
    link: "/hr",
    items: [
      { id: 30, label: "Employees", icon: "fa-light fa-users", link: "/hr/employees" },
      { id: 301, label: "Schedules", icon: "fa-light fa-calendar-clock", link: "/hr/schedules" },
      { id: 302, label: "Payroll", icon: "fa-light fa-money-check-dollar", link: "/hr/payroll" },
      { id: 303, label: "Leave", icon: "fa-light fa-calendar-days", link: "/hr/leave" },
      { id: 304, label: "Time Tracking", icon: "fa-light fa-clock", link: "/hr/time-tracking" },
    ],
  },
  {
    id: "learning",
    module: "learning",
    label: "Courses",
    icon: "icon-training",
    items: [
      { id: 24, label: "Courses", icon: "icon-training", link: "/courses" },
      { id: 241, label: "Student Portal", icon: "fa-light fa-graduation-cap", link: "/student" },
      { id: 25, label: "Certificates", icon: "icon-trophy", link: "/courses/certificates" },
      { id: 26, label: "Community", icon: "fa-light fa-comments", link: "/community/forums" },
      { id: 27, label: "Media Center", icon: "fa-light fa-folder-open", link: "/media" },
    ],
  },
  {
    id: "communication",
    module: "communication",
    label: "Communication",
    icon: "fa-light fa-comments",
    items: [
      { id: 3, label: "Chat", icon: "fa-light fa-comments", link: "/conversations" },
      { id: 34, label: "LENA Chat", icon: "fa-light fa-robot", link: "/settings/lena-chat" },
    ],
  },
  {
    id: "settings",
    module: "settings",
    label: "Settings",
    icon: "fa-light fa-gear",
    items: [
      { id: 29, label: "Settings", icon: "fa-light fa-gear", link: "/settings" },
      { id: 32, label: "Integrations", icon: "fa-light fa-plug", link: "/settings/integrations-hub" },
      { id: 33, label: "Developer & API", icon: "fa-light fa-code", link: "/settings/developer" },
      { id: 22, label: "Support", icon: "fa-light fa-life-ring", link: "/support" },
    ],
  },
  // Help Center was here as a promoted top-level item; it now lives in the
  // top bar next to the workspace switcher instead (still routes to the
  // unchanged /articles page) -- removed from this array rather than kept
  // as a dead duplicate entry.
];

export default dashboardNav;
