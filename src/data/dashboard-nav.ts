import { NavModule } from "@/interface";

const dashboardNav: NavModule[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "fa-light fa-house",
    link: "/dashboard",
    permission: "dashboard",
  },
  {
    id: "crm-sales",
    label: "CRM & Sales",
    icon: "fa-light fa-users",
    items: [
      { id: 5, label: "Contacts", icon: "fa-light fa-users", link: "/contacts", permission: "contacts" },
      { id: 52, label: "Tags", icon: "fa-light fa-tags", link: "/contacts/tags", permission: "contacts" },
      { id: 51, label: "Lead Finder", icon: "fa-light fa-magnifying-glass-location", link: "/lead-finder", permission: "contacts" },
      { id: 155, label: "Territory Map", icon: "fa-light fa-map-location-dot", link: "/lead-finder/map", permission: "contacts" },
      { id: 6, label: "Pipelines", icon: "icon-projects", link: "/pipelines", permission: "pipelines" },
      { id: 7, label: "Proposals", icon: "fa-light fa-file-signature", link: "/proposals", permission: "proposals" },
      { id: 81, label: "Quotes", icon: "fa-light fa-file-invoice", link: "/quotes", permission: "invoices" },
      { id: 2, label: "Tasks", icon: "fa-light fa-circle-check", link: "/tasks", permission: "dashboard" },
      { id: 21, label: "Projects", icon: "icon-projects", link: "/projects", permission: "business" },
      { id: 23, label: "Automations", icon: "fa-light fa-bolt", link: "/automations", permission: "automation" },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    icon: "fa-light fa-bullhorn",
    items: [
      { id: 13, label: "Campaigns", icon: "fa-light fa-paper-plane", link: "/campaigns", permission: "marketing" },
      { id: 115, label: "Segments", icon: "fa-light fa-users-rectangle", link: "/segments", permission: "marketing" },
      { id: 114, label: "Email Sequences", icon: "fa-light fa-inbox-out", link: "/sequences", permission: "marketing" },
      { id: 116, label: "Bulk SMS", icon: "fa-light fa-comment-sms", link: "/sms", permission: "marketing" },
      { id: 117, label: "WhatsApp Broadcasts", icon: "fa-brands fa-whatsapp", link: "/whatsapp-broadcasts", permission: "marketing" },
      { id: 12, label: "Funnels", icon: "fa-light fa-filter", link: "/funnels", permission: "marketing" },
      { id: 14, label: "Forms", icon: "icon-document", link: "/forms", permission: "marketing" },
      { id: 17, label: "Ads", icon: "icon-announcement", link: "/ads", permission: "marketing" },
      { id: 113, label: "AI Studio", icon: "fa-light fa-sparkles", link: "/ai-studio", permission: "marketing" },
      { id: 118, label: "Content Studio", icon: "fa-light fa-pen-nib", link: "/content-studio", permission: "marketing" },
      { id: 16, label: "Reputation", icon: "icon-trophy", link: "/reputation", permission: "marketing" },
      { id: 11, label: "Websites", icon: "fa-light fa-browser", link: "/websites", permission: "marketing" },
      { id: 112, label: "Blogs", icon: "fa-light fa-newspaper", link: "/blog/manage", permission: "marketing" },
    ],
  },
  {
    id: "social",
    label: "Social",
    icon: "fa-light fa-share-nodes",
    items: [
      { id: 150, label: "Composer", icon: "fa-light fa-pen-to-square", link: "/social", permission: "marketing" },
      { id: 151, label: "Connections", icon: "fa-light fa-plug", link: "/social/connections", permission: "marketing" },
      { id: 152, label: "Calendar", icon: "fa-light fa-calendar-days", link: "/social/calendar", permission: "marketing" },
      { id: 153, label: "Inbox", icon: "fa-light fa-inbox", link: "/social/inbox", permission: "marketing" },
      { id: 154, label: "Analytics", icon: "fa-light fa-chart-line", link: "/social/analytics", permission: "marketing" },
    ],
  },
  {
    // Flat list, no inner accordion (same treatment as HR & Payroll above). The old
    // nested "Finance" subItems container has been dissolved -- every page links
    // directly and is always visible once the section is open, no expand/collapse.
    // "commerce" gates the accounting pages (unchanged from the old container's
    // inherited permission); Invoices keeps "invoices" and Compliance Hub keeps
    // "contacts", matching their standalone entries pre-flatten.
    id: "finance-accounting",
    label: "Finance & Accounting",
    icon: "fa-light fa-chart-line",
    items: [
      { id: 20, label: "Overview", icon: "fa-light fa-chart-line", link: "/finance", permission: "commerce" },
      { id: 201, label: "Revenue Forecast", icon: "fa-light fa-chart-mixed", link: "/finance/revenue-forecast", permission: "commerce" },
      { id: 202, label: "Transactions", icon: "fa-light fa-arrow-right-arrow-left", link: "/finance/transactions", permission: "commerce" },
      { id: 203, label: "Reconciliation", icon: "fa-light fa-scale-balanced", link: "/finance/reconciliation", permission: "commerce" },
      // Invoices / Credit Notes / Retainers sit next to Reconciliation -- they're the
      // billing-document side of the same money flow (an invoice gets reconciled, a
      // credit note reverses one, a retainer draws down against them).
      { id: 8, label: "Invoices", icon: "fa-light fa-file-invoice-dollar", link: "/invoices", permission: "invoices" },
      { id: 83, label: "Credit Notes", icon: "fa-light fa-file-minus", link: "/finance/credit-notes", permission: "commerce" },
      { id: 84, label: "Retainers", icon: "fa-light fa-wallet", link: "/finance/retainers", permission: "commerce" },
      { id: 204, label: "Connected Accounts", icon: "fa-light fa-building-columns", link: "/finance/connected-accounts", permission: "commerce" },
      { id: 205, label: "Payment Gateways", icon: "fa-light fa-credit-card", link: "/finance/payment-gateways", permission: "commerce" },
      { id: 85, label: "Chart of Accounts", icon: "fa-light fa-landmark", link: "/finance/chart-of-accounts", permission: "commerce" },
      { id: 206, label: "Expenses", icon: "fa-light fa-receipt", link: "/finance/expenses", permission: "commerce" },
      { id: 207, label: "Reports", icon: "fa-light fa-chart-pie", link: "/finance/reports", permission: "commerce" },
      { id: 82, label: "Compliance Hub", icon: "fa-light fa-shield-halved", link: "/admin/compliance", permission: "contacts" },
    ],
  },
  {
    id: "commerce-ops",
    label: "Commerce & Ops",
    icon: "fa-light fa-box",
    items: [
      { id: 18, label: "Products", icon: "fa-light fa-box", link: "/products", permission: "commerce" },
      { id: 19, label: "Orders", icon: "fa-light fa-bag-shopping", link: "/orders", permission: "commerce" },
      { id: 191, label: "Shipments", icon: "fa-light fa-truck", link: "/shipments", permission: "commerce" },
      {
        id: 192,
        label: "Affiliates",
        icon: "fa-light fa-handshake",
        link: "/affiliates",
        permission: "commerce",
        subItems: [
          { label: "Management", link: "/affiliates" },
          { label: "Affiliate Portal", link: "/affiliate-portal" },
          { label: "Program Marketplace", link: "/affiliate-marketplace" },
        ],
      },
      { id: 31, label: "Inventory", icon: "fa-light fa-boxes-stacked", link: "/inventory", permission: "commerce" },
    ],
  },
  {
    // Flat list, no accordion (same treatment as HR & Payroll / Finance & Accounting) --
    // every item links directly and is always visible once the section is open. Promoted
    // out of "Commerce & Ops", where Calendars / Waitlists / Instant Meet sat beside the
    // genuine e-commerce items (Products, Orders, Shipments, Affiliates, Inventory) purely
    // by historical accident -- scheduling isn't commerce. All three keep the "calendar"
    // permission and their real, unchanged routes (/calendar, /calendar/waitlist,
    // /calendar/instant-meet); this is a nav-location move only, no route or page change.
    id: "calendar-meetings",
    label: "Calendar & Meetings",
    icon: "fa-light fa-calendar-days",
    items: [
      { id: 9, label: "Calendars", icon: "fa-light fa-calendar-days", link: "/calendar", permission: "calendar" },
      { id: 10, label: "Waitlists", icon: "fa-light fa-clock-rotate-left", link: "/calendar/waitlist", permission: "calendar" },
      { id: 101, label: "Instant Meet", icon: "fa-light fa-video", link: "/calendar/instant-meet", permission: "calendar" },
    ],
  },
  {
    // Flat list, no accordion (deliberately unlike Finance/Affiliates below, which keep
    // their real subItems-container pattern) -- each item links directly and is always
    // visible, no expand/collapse. Role gating (Employees is HR-role-restricted) moved
    // from isSubItemAllowed to isItemAllowed in filterNavByPermissions.ts to match.
    id: "hr-payroll",
    label: "HR & Payroll",
    icon: "fa-light fa-users-gear",
    // Not a "direct link" module (NavRailModule only treats `link` as a direct link
    // when `items` is absent) -- this exists solely so /hr (the overview page, reached
    // via each sub-page's "Overview" link, not a distinct sidebar entry) still resolves
    // to this module for active-state highlighting.
    link: "/hr",
    items: [
      { id: 30, label: "Employees", icon: "fa-light fa-users", link: "/hr/employees", permission: "commerce" },
      { id: 301, label: "Schedules", icon: "fa-light fa-calendar-clock", link: "/hr/schedules", permission: "commerce" },
      { id: 302, label: "Payroll", icon: "fa-light fa-money-check-dollar", link: "/hr/payroll", permission: "commerce" },
      { id: 303, label: "Leave", icon: "fa-light fa-calendar-days", link: "/hr/leave", permission: "commerce" },
      { id: 304, label: "Time Tracking", icon: "fa-light fa-clock", link: "/hr/time-tracking", permission: "commerce" },
    ],
  },
  {
    id: "learning",
    label: "Courses",
    icon: "icon-training",
    items: [
      { id: 24, label: "Courses", icon: "icon-training", link: "/courses", permission: "learning" },
      { id: 241, label: "Student Portal", icon: "fa-light fa-graduation-cap", link: "/student" },
      { id: 25, label: "Certificates", icon: "icon-trophy", link: "/courses/certificates", permission: "learning" },
      { id: 26, label: "Community", icon: "fa-light fa-comments", link: "/community/forums", permission: "business" },
      { id: 27, label: "Media Center", icon: "fa-light fa-folder-open", link: "/media", permission: "business" },
    ],
  },
  {
    id: "communication",
    label: "Communication",
    icon: "fa-light fa-comments",
    items: [
      { id: 3, label: "Chat", icon: "fa-light fa-comments", link: "/conversations", permission: "contacts" },
      { id: 34, label: "LENA Chat", icon: "fa-light fa-robot", link: "/settings/lena-chat", permission: "settings" },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: "fa-light fa-gear",
    items: [
      { id: 29, label: "Settings", icon: "fa-light fa-gear", link: "/settings", permission: "settings" },
      { id: 32, label: "Integrations", icon: "fa-light fa-plug", link: "/settings/integrations-hub", permission: "settings" },
      { id: 33, label: "Developer & API", icon: "fa-light fa-code", link: "/settings/developer", permission: "settings" },
      { id: 22, label: "Support", icon: "fa-light fa-life-ring", link: "/support", permission: "business" },
      { id: 221, label: "Help Center", icon: "fa-light fa-circle-question", link: "/articles", permission: "business" },
    ],
  },
];

export default dashboardNav;
