import { SidebarCategory } from "@/interface";

const sidebarData: SidebarCategory[] = [
  {
    id: 1,
    category: "Main",
    items: [
      {
        id: 1,
        label: "Dashboards",
        icon: "icon-house",
        subItems: [
          { label: "HRM Dashboard", link: "/dashboard/hrm-dashboard" },
          {
            label: "Employee Dashboard",
            link: "/dashboard/employee-dashboard",
          },
          { label: "CRM Analytics", link: "/dashboard/crm-dashboard" },
        ],
      },
      {
        id: 2,
        label: "HRM",
        icon: "icon-hrm",
        subItems: [
          { label: "Employee", link: "/hrm/employee" },
          { label: "Employee Profile", link: "/hrm/employee-profile" },
          { label: "Designations", link: "/hrm/designations" },
          { label: "Admin Attendance", link: "/hrm/attendance" },
          { label: "Employee Attendance", link: "/hrm/employee-attendance" },
          { label: "Biometric Attendance", link: "/hrm/biometric-attendance" },
          { label: "Office Loan", link: "/hrm/office-loan" },
          { label: "Personal Loan", link: "/hrm/personal-loan" },
          { label: "Employee leaves", link: "/hrm/leaves-employee" },
          { label: "Admin leaves", link: "/hrm/leaves" },
          { label: "Holidays", link: "/hrm/holidays" },
          { label: "Time Sheet", link: "/hrm/timesheet" },
          { label: "Schedule", link: "/hrm/schedule" },
          { label: "Overtime", link: "/hrm/overtime" },
          { label: "Warning", link: "/hrm/warning" },
        ],
      },
      {
        id: 3,
        label: "CRM",
        icon: "icon-crm",
        subItems: [
          { label: "Leads", link: "/crm/leads" },
          { label: "Deals", link: "/crm/deals" },
          { label: "CRM Setup", link: "/crm/crm-setup" },
        ],
      },
      {
        id: 4,
        label: "Apps",
        icon: "fa-sharp fa-light fa-grid-2",
        subItems: [
          { label: "Chat", link: "/apps/app-chat" },
          { label: "Email Inbox", link: "/apps/email-inbox" },
          { label: "Email Read", link: "/apps/email-read" },
          { label: "Email Compose", link: "/apps/email-compose" },
          { label: "Contacts", link: "/apps/contacts" },
          { label: "Calendar", link: "/apps/calendar" },
        ],
      },
      {
        id: 5,
        label: "Payroll",
        icon: "fa-sharp fa-light fa-wallet",
        subItems: [
          { label: "Pay List", link: "/payroll/payroll" },
          { label: "Payslip", link: "/payroll/payroll-payslip" },
        ],
      },
      {
        id: 6,
        label: "Expense",
        icon: "icon-announcement",
        link: "/expense",
      },
      {
        id: 7,
        label: "Company",
        icon: "fa-sharp fa-light fa-wallet",
        subItems: [
          { label: "Company List", link: "/company/companies" },
          { label: "Company Details", link: "/company/company-details" },
        ],
      },
      {
        id: 8,
        label: "Clients",
        icon: "fa-sharp fa-light fa-wallet",
        subItems: [
          { label: "Clients", link: "/clients" },
          { label: "Client Details", link: "/clients/client-details" },
        ],
      },
      {
        id: 9,
        label: "Projects",
        icon: "icon-projects",
        subItems: [
          { label: "Projects", link: "/project" },
          { label: "Projects Details", link: "/project/project-details" },
          { label: "Projects Create", link: "/project/project-create" },
        ],
      },
      {
        id: 10,
        label: "Activities",
        icon: "fa-sharp fa-regular fa-chart-network",
        link: "/activities",
      },
      {
        id: 11,
        label: "Training",
        icon: "icon-training",
        link: "/training",
      },
      {
        id: 12,
        label: "Resignation",
        icon: "icon-resignation",
        link: "/resignation",
      },
      {
        id: 13,
        label: "Promotion",
        icon: "icon-promotion",
        link: "/promotion",
      },
      {
        id: 14,
        label: "Award",
        icon: "icon-trophy",
        link: "/award",
      },
      {
        id: 15,
        label: "Meeting",
        icon: "icon-meeting",
        link: "/meeting",
      },
      {
        id: 16,
        label: "Tickets",
        icon: "icon-tickets1",
        subItems: [
          { label: "Tickets List", link: "/tickets" },
          { label: "Tickets Reply", link: "/tickets/tickets-reply" },
        ],
      },
      {
        id: 17,
        label: "Transfer",
        icon: "fa-sharp fa-regular fa-right-left",
        link: "/transfer",
      },
      {
        id: 18,
        label: "Termination",
        icon: "icon-termination",
        link: "/termination",
      },
      {
        id: 19,
        label: "Document",
        icon: "icon-document",
        link: "/document",
      },
      {
        id: 20,
        label: "Announcement",
        icon: "icon-announcement",
        link: "/announcement",
      },
      {
        id: 21,
        label: "Invoice",
        icon: "fa-light fa-book-blank",
        subItems: [
          { label: "Invoice Create", link: "/invoice/app-invoice-add" },
          { label: "Invoice Preview", link: "/invoice/app-invoice-preview" },
          { label: "Invoice Edit", link: "/invoice/app-invoice-edit" },
          { label: "Invoice List", link: "/invoice/app-invoice-list" },
        ],
      },
    ],
  },
  {
    id: 2,
    category: "Pages",
    items: [
      {
        id: 22,
        link: "#",
        label: "Authentication",
        icon: "fa-sharp fa-light fa-key",
        subItems: [
          {
            link: "#",
            label: "Sign In",
            subItems: [
              { label: "Basic", link: "/auth/signin-basic" },
              { label: "Cover", link: "/auth/signin-cover" },
            ],
          },
          {
            link: "#",
            label: "Sign Up",
            subItems: [
              { label: "Basic", link: "/auth/signup-basic" },
              { label: "Cover", link: "/auth/signup-cover" },
            ],
          },
          {
            link: "#",
            label: "Reset Password",
            subItems: [
              { label: "Basic", link: "/auth/reset-password-basic" },
              { label: "Cover", link: "/auth/reset-password-cover" },
            ],
          },
          {
            link: "#",
            label: "Forgot Password",
            subItems: [
              { label: "Basic", link: "/auth/forgot-password-basic" },
              { label: "Cover", link: "/auth/forgot-password-cover" },
            ],
          },
          { label: "Coming Soon", link: "/coming-soon" },
          { label: "Under Maintenance", link: "/maintenance" },
          { label: "Offline", link: "/offline" },
        ],
      },
      {
        id: 23,
        label: "Error",
        icon: "fa-sharp fa-light fa-triangle-exclamation",
        subItems: [
          { label: "404 Page", link: "/404-error-page" },
          { label: "404 Page 2", link: "/404-error-page-2" },
          { label: "500 Page", link: "/500-error-page" },
        ],
      },
      {
        id: 24,
        label: "Pages",
        icon: "fa-light fa-clone",
        subItems: [
          { label: "Search", link: "/pages/search" },
          { label: "Faq", link: "/pages/faq" },
          { label: "Terms and Conditions", link: "/pages/terms-conditions" },
          { label: "Privacy and Policy", link: "/pages/privacy-policy" },
          { label: "Blank Page", link: "/pages/blank-page" },
          {
            label: "Blog",
            link: "#",
            subItems: [
              { label: "Blog", link: "/pages/blog/blog" },
              { label: "Blog Details", link: "/pages/blog/blog-details" },
              { label: "Create Blog", link: "/pages/blog/blog-create" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 3,
    category: "General",
    items: [
      {
        id: 25,
        label: "Forms",
        icon: "fa-light fa-notebook",
        subItems: [
          { label: "Form Style", link: "/elements/form-style" },
          { label: "Form Basic Input", link: "/elements/form-basic-input" },
          { label: "Forms Input Groups", link: "/elements/forms-input-groups" },
          { label: "Form Editors", link: "/elements/forms-editors" },
          { label: "Time & Datepicker", link: "/elements/time-datepicker" },
        ],
      },
      {
        id: 26,
        label: "Base UI",
        icon: "fa-light fa-clone",
        subItems: [
          { label: "Alert", link: "/elements/alert" },
          { label: "Badge", link: "/elements/badge" },
          { label: "Buttons", link: "/elements/buttons" },
          { label: "Breadcrumb", link: "/elements/breadcrumb" },
          { label: "Template Color", link: "/elements/template-color" },
          { label: "Avatars", link: "/elements/avatars" },
          { label: "Progress Bar", link: "/elements/progress-bar" },
          { label: "Modal", link: "/elements/modal" },
          { label: "Popover", link: "/elements/popover" },
          { label: "Snackbar", link: "/elements/toasts" },
          { label: "Accordions", link: "/elements/accordions" },
          { label: "Navs Tabs", link: "/elements/navs-tabs" },
          { label: "Dropdown", link: "/elements/dropdown" },
          { label: "Tooltip", link: "/elements/tooltip" },
          { label: "Video", link: "/elements/video" },
        ],
      },
      {
        id: 27,
        label: "Advanced UI",
        icon: "fa-light fa-feather",
        subItems: [
          { label: "Rating", link: "/elements/rating" },
          { label: "Dropzone", link: "/elements/dropzone" },
          { label: "Swiper", link: "/elements/swiper" },
          { label: "Ribbons", link: "/elements/ribbons" },
          { label: "Pagination", link: "/elements/pagination" },
          { label: "Steps", link: "/elements/steps" },
          { label: "Range Slider", link: "/elements/range-slider" },
          { label: "Team", link: "/elements/team" },
          { label: "Timeline", link: "/elements/timeline" },
          { label: "Grid", link: "/elements/grid" },
        ],
      },
    ],
  },
  {
    id: 4,
    category: "Icons",
    items: [
      {
        id: 28,
        label: "Icomoon",
        icon: "icon-icons",
        link: "/elements/element-icon",
      },
    ],
  },
  {
    id: 5,
    category: "Tables & Charts",
    items: [
      {
        id: 29,
        label: "Tables",
        icon: "fa-regular fa-pause",
        subItems: [
          { label: "Table Basic", link: "/table/tables-basic" },
          { label: "Table Database", link: "/table/tables-database" },
        ],
      },
      {
        id: 30,
        label: "Charts",
        icon: "icon-apexcharts",
        subItems: [
          {
            label: "Apex Charts",
            link: "#",
            subItems: [
              { label: "Line Charts", link: "/elements/apex-charts-line" },
              { label: "Area Charts", link: "/elements/apex-charts-area" },
              { label: "Column Charts", link: "/elements/apex-charts-column" },
              { label: "Bar Charts", link: "/elements/apex-charts-bar" },
              { label: "Mixed Charts", link: "/elements/apex-charts-mixed" },
              { label: "Range Charts", link: "/elements/apex-charts-range" },
              {
                label: "Timeline Charts",
                link: "/elements/apex-charts-timeline",
              },
              {
                label: "Candlestick Charts",
                link: "/elements/apex-charts-candlestick",
              },
              {
                label: "Box & Whisker Charts",
                link: "/elements/apex-charts-box-whisker",
              },
              { label: "Pie Charts", link: "/elements/apex-charts-pie" },
              { label: "Radar Charts", link: "/elements/apex-charts-radar" },
              {
                label: "Polar Area Charts",
                link: "/elements/apex-charts-polar-area",
              },
              {
                label: "Tree Map Charts",
                link: "/elements/apex-charts-treemap",
              },
              {
                label: "Heatmap Charts",
                link: "/elements/apex-charts-heatmap",
              },
              { label: "Bubble Charts", link: "/elements/apex-charts-bubble" },
              {
                label: "Scatter Charts",
                link: "/elements/apex-charts-scatter",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 6,
    category: "MultiLevel",
    items: [
      {
        id: 31,
        label: "MultiLevel Menu",
        icon: "fa-sharp fa-solid fa-arrow-turn-down",
        subItems: [
          { label: "Level-1.0", link: "#" },
          {
            label: "Level-2.0",
            link: "#",
            subItems: [
              { label: "Level-2.1", link: "#" },
              {
                label: "Level-2.2",
                link: "#",
                subItems: [
                  { label: "Level-3.0", link: "#" },
                  { label: "Level-3.0", link: "/hrm/leaves-employee" },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

export default sidebarData;
