# LeadsMind Design System
### The Official Reference for Every Feature — Existing & New
> **Rule:** Before implementing any UI feature, screen, component, or change — read this file first. Every pixel must follow this guide. No exceptions.

---

## Table of Contents
1. [Design Philosophy](#1-design-philosophy)
2. [Color Tokens](#2-color-tokens)
3. [Typography](#3-typography)
4. [Spacing & Layout](#4-spacing--layout)
5. [CSS Variables — Copy & Paste](#5-css-variables--copy--paste)
6. [Core Components](#6-core-components)
7. [Navigation & Sidebar Rules](#7-navigation--sidebar-rules)
8. [Page Layout Template](#8-page-layout-template)
9. [Empty States — Never Show a Blank Box](#9-empty-states--never-show-a-blank-box)
10. [Data Display Rules](#10-data-display-rules)
11. [Forms & Inputs](#11-forms--inputs)
12. [Buttons](#12-buttons)
13. [Badges & Status Labels](#13-badges--status-labels)
14. [Cards & Panels](#14-cards--panels)
15. [Kanban Boards](#15-kanban-boards)
16. [Pipeline Boards](#16-pipeline-boards)
17. [Split-Panel Pages](#17-split-panel-pages)
18. [Inbox & Messaging UI](#18-inbox--messaging-ui)
19. [Modals & Dialogs](#19-modals--dialogs)
20. [Notifications & Toasts](#20-notifications--toasts)
21. [Icons](#21-icons)
22. [Animation & Transitions](#22-animation--transitions)
23. [Prohibited Patterns](#23-prohibited-patterns)
24. [New Feature Checklist](#24-new-feature-checklist)
25. [Engineering Rules](#25-engineering-rules)

---

## 1. Design Philosophy

LeadsMind follows a **Dark Navy Premium** aesthetic — not generic dark mode. It is deliberate, layered, and professional. Every screen communicates authority and clarity.

### Core Principles

| Principle | Meaning |
|-----------|---------|
| **Dark by Default** | Every background is a navy shade, never pure black or grey |
| **Layered Depth** | Cards sit above backgrounds, panels sit above cards — always 3 visible depth levels |
| **Colour Encodes Meaning** | Blue = actions/info, Green = success/live, Amber = warnings/money, Red = danger/overdue, Purple = draft/creative |
| **Never Empty** | Every empty state must have an icon, a title, a description, and a CTA button |
| **Data First** | If data exists, show it with context — counts, trends, values, not just numbers |
| **Consistent Accent** | Primary accent is always `#2563eb` (blue). Never randomly switch accent colours |

### Tone
- Professional, not corporate
- Clean, not sterile
- Energetic, not loud

---

## 2. Color Tokens

### Navy Backgrounds (Darkest → Lightest)

```
--n900: #04091a   ← Page / outermost background
--n800: #080f28   ← Sidebar, Topbar, Card backgrounds
--n700: #0c1535   ← Hover states, subtle panels
--n600: #111d47   ← Input backgrounds, pressed states
--n500: #172458   ← Borders on hover, scrollbar thumbs
--n400: #1f2f72   ← Strong borders
```

### Accent / Semantic Colours

```
--accent:        #2563eb   ← Primary blue (buttons, active states, links)
--accent2:       #3b82f6   ← Lighter blue (icons, highlights, text accents)
--accentg:       rgba(37,99,235,0.14)  ← Blue tint backgrounds
--green:         #10b981   ← Success, Live, Paid, Completed, Online
--amber:         #f59e0b   ← Revenue, Warnings, Pending, Money values
--red:           #ef4444   ← Errors, Overdue, Danger, Delete
--purple:        #8b5cf6   ← Draft, Creative, Automations, Learning
--cyan:          #06b6d4   ← Social, Secondary data, Contacted stage
--pink:          #ec4899   ← Instagram, Reputation, soft accents
```

### Text Colours

```
--t1: #eef2ff   ← Primary text (headings, important labels)
--t2: #94a3c8   ← Secondary text (descriptions, meta)
--t3: #4a5a82   ← Muted text (placeholders, timestamps, hints)
--t4: #2a3557   ← Ghost text (watermarks, disabled)
```

### Border Colours

```
--bdr:  rgba(255,255,255,0.07)   ← Default border
--bdrh: rgba(255,255,255,0.13)   ← Hovered border
```

### Colour Usage Rules

- **Revenue / Money** → always use `--amber` (`#f59e0b`)
- **Paid / Success / Live** → always `--green`
- **Draft / Unpublished** → always `--purple`
- **Overdue / Error** → always `--red`
- **Pending / In Progress** → always `--amber`
- **Actions / Links / Primary** → always `--accent` blue
- **Stage: Lead** → `--accent2` blue
- **Stage: Contacted** → `--cyan`
- **Stage: Proposal** → `--purple`
- **Stage: Negotiation** → `--amber`
- **Stage: Won/Closing** → `--green`

---

## 3. Typography

### Fonts — BOTH are mandatory

```
Display / Headings / Numbers: 'Space Grotesk', sans-serif
Body / Labels / UI text:      'DM Sans', sans-serif
```

**Google Fonts import (always include both):**
```html
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### Type Scale

| Role | Font | Size | Weight | Usage |
|------|------|------|--------|-------|
| Page Title H1 | Space Grotesk | 22px | 700 | "Marketing Funnels", "Tasks Manager" |
| Page Title Accent | Space Grotesk | 22px | 700 | Second word in title, colour `--accent2` |
| Section Title | Space Grotesk | 15px | 600 | Card headings, panel titles |
| Metric Value | Space Grotesk | 24–28px | 700 | Stat cards, totals, KPIs |
| Body Text | DM Sans | 13.5px | 400 | Descriptions, body copy |
| Label / Meta | DM Sans | 12px | 500 | Field labels, metadata |
| Small / Muted | DM Sans | 11px | 400 | Timestamps, hints, sub-labels |
| Section Group Label | DM Sans | 10px | 600 | Sidebar section titles (ALL CAPS) |
| Badge / Tag | DM Sans | 10.5px | 600 | Status badges, count pills |

### Page Title Pattern
Every page title uses a two-word structure: first word in `--t1`, second word in `--accent2`:
```
MARKETING <FUNNELS>      Tasks <MANAGER>
Billing <LEDGER>         Proposal <STUDIO>
Pipeline <BOARD>         Hello, <GulfBridge>
```

### Subtitle Pattern
Below every page title, a subtitle in UPPERCASE tracking with `--t3`:
```css
font-size: 11.5px;
color: var(--t3);
text-transform: uppercase;
letter-spacing: 0.8px;
font-weight: 500;
```

---

## 4. Spacing & Layout

### Base Grid
- Page padding: `24px` left/right
- Top padding from topbar: `20px`
- Gap between major sections: `20px`
- Gap between cards in a grid: `14px`
- Gap inside a card body: `12px`

### Border Radius Scale
```
--r8:  8px    ← Buttons, inputs, small elements
--r12: 12px   ← Cards, panels, dropdowns
--r16: 16px   ← Large document cards, modals
50%          ← Avatars, online dots, count badges
```

### Topbar Height: `54px`
### Sidebar Width: `240px` (expanded) / `62px` (collapsed)

---

## 5. CSS Variables — Copy & Paste

Always declare these in `:root` at the top of every page stylesheet:

```css
:root {
  /* Backgrounds */
  --n900: #04091a;
  --n800: #080f28;
  --n700: #0c1535;
  --n600: #111d47;
  --n500: #172458;
  --n400: #1f2f72;

  /* Accents */
  --accent:  #2563eb;
  --accent2: #3b82f6;
  --accentg: rgba(37, 99, 235, 0.14);

  /* Semantic */
  --green:  #10b981;
  --amber:  #f59e0b;
  --red:    #ef4444;
  --purple: #8b5cf6;
  --cyan:   #06b6d4;
  --pink:   #ec4899;

  /* Text */
  --t1: #eef2ff;
  --t2: #94a3c8;
  --t3: #4a5a82;
  --t4: #2a3557;

  /* Borders */
  --bdr:  rgba(255, 255, 255, 0.07);
  --bdrh: rgba(255, 255, 255, 0.13);

  /* Cards */
  --card:      rgba(12, 21, 53, 0.85);
  --card-hover: rgba(21, 37, 80, 0.9);

  /* Border Radius */
  --r8:  8px;
  --r12: 12px;
  --r16: 16px;
}
```

---

## 6. Core Components

### Topbar
Fixed, 54px tall, `background: var(--n800)`, `border-bottom: 1px solid var(--bdr)`.

Required elements (left → right):
1. Greeting: `Hello, <WorkspaceName> 👋` — Space Grotesk 15px 700, workspace name in `--accent2`
2. Search bar — max-width 320px, `background: rgba(255,255,255,0.05)`, shortcut hint `⌘K`
3. Right cluster: Bell icon (with blue notification dot), Message icon, Avatar circle, Name + Online badge

```css
/* Online badge pattern */
.online-dot::before {
  content: '';
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--green);
  margin-right: 4px;
}
color: var(--green);
font-size: 11px;
```

### Quick Actions Bar
Sits below topbar on Dashboard only. Horizontal row of action buttons:
```
Quick Actions: [+ New Lead] [New Invoice] [Send Campaign] [Book Appointment] [New Automation] [New Proposal]
```
Primary button is first. All others are ghost style. Scrollable on overflow.

---

## 7. Navigation & Sidebar Rules

### Sidebar Structure (top → bottom)
```
[Logo Area]
MAIN        → Dashboard, Tasks (badge), Inbox (badge)
RELATIONS   → Contacts, Pipelines ▾, Proposals ▾, Invoices ▾
SCHEDULING  → Calendars ▾, Waitlists
MARKETING   → Websites, Funnels ▾, Campaigns ▾ (badge), Forms, Social ▾, Reputation, Ads
COMMERCE    → Products ▾, Orders ▾, Expenses
BUSINESS    → Projects ▾, Support, Automations ▾, Learning, Certificates, Community, Media Center
ANALYTICS   → Reporting ▾
ACCOUNT     → Settings ▾
```

### Nav Item Rules
- Default state: colour `--t2`, icon `--t3`
- Hover state: `background: rgba(255,255,255,0.06)`, colour `--t1`
- Active state: `background: var(--accentg)`, colour `--accent2`, icon `--accent2`
- Border radius: `8px`, margin: `1px 8px`
- Font: DM Sans 13.5px 500

### Dropdown (Submenu) Rules
Any nav item with sub-pages gets a chevron `▾` on the right. On click:
- Chevron rotates 180°
- Sub-items slide in below parent
- Sub-items indented `36px` from left
- Sub-item style: 12.5px, `--t3` default, `--t1` on hover
- Sub-item has a small `5px` dot before text

### Sidebar Badges
```css
/* Count badge */
background: var(--accent);   /* blue for unread/new */
background: var(--amber);    /* amber for tasks due */
background: var(--green);    /* green for active campaigns */
```

### Sidebar Collapse
- Collapsed width: `62px`
- Shows icons only — labels, badges, chevrons, section titles all hidden
- Sub-menus force-hidden in collapsed mode
- Nav items center their icon: `justify-content: center; padding: 10px`
- Toggle pill at bottom-left, rotates `<<` → `>>`

### Section Title Style
```css
font-size: 10px;
font-weight: 600;
letter-spacing: 1.2px;
text-transform: uppercase;
color: var(--t3);
padding: 16px 16px 6px;
```

---

## 8. Page Layout Template

Every inner page follows this exact structure:

```
┌─────────────────────────────────────────────────────┐
│  TOPBAR (54px, sticky)                              │
├─────────────────────────────────────────────────────┤
│  PAGE TABS (if multi-tab screen)                    │
├─────────────────────────────────────────────────────┤
│  PAGE HEADER                                        │
│  [Title + Subtitle]         [Action Buttons]        │
├─────────────────────────────────────────────────────┤
│  TOOLBAR                                            │
│  [Filter Pills] [Separator] [View Toggle]           │
├─────────────────────────────────────────────────────┤
│  PAGE CONTENT                                       │
│  [Stats Row if applicable]                          │
│  [Main Content Grid / List / Board]                 │
└─────────────────────────────────────────────────────┘
```

### Page Header Pattern
```html
<div class="page-header">
  <div class="ph-left">
    <h1>First Word <span style="color:var(--accent2)">Second Word</span></h1>
    <p style="font-size:11.5px; color:var(--t3); text-transform:uppercase; letter-spacing:0.8px;">
      Subtitle describing what this page does
    </p>
  </div>
  <div class="ph-right">
    <!-- Ghost buttons first, Primary button last (rightmost) -->
    <button class="btn-ghost">Secondary Action</button>
    <button class="btn-primary">+ Primary Action</button>
  </div>
</div>
```

### Toolbar Filter Pills Pattern
```html
<div class="toolbar">
  <div class="filter active">All Items (12)</div>
  <div class="filter">● Live (4)</div>
  <div class="filter">● Draft (3)</div>
  <div class="filter">● Pending (2)</div>
  <!-- separator -->
  <div class="view-toggle">
    <button class="vt-btn active">⊞ Grid</button>
    <button class="vt-btn">≡ List</button>
    <button class="vt-btn">📅 Calendar</button>
  </div>
</div>
```

---

## 9. Empty States — Never Show a Blank Box

**This is mandatory.** If a section has no data, it must show a structured empty state — never a blank card, never just "No data found" text, and never a floating icon with no context.

### Empty State Template
```html
<div class="empty-state">
  <!-- Icon -->
  <div style="font-size:28px; color:var(--t3); opacity:0.5;">
    <!-- Use a relevant Font Awesome icon -->
    <i class="fa-solid fa-chart-line"></i>
  </div>

  <!-- Title -->
  <div style="font-size:13px; font-weight:600; color:var(--t2);">
    No funnels yet
  </div>

  <!-- Description (max 2 lines, helpful not generic) -->
  <div style="font-size:12px; color:var(--t3); max-width:200px; text-align:center; line-height:1.5;">
    Create your first funnel to start capturing leads and driving conversions
  </div>

  <!-- CTA Button (always present) -->
  <button class="btn-primary" style="margin-top:4px;">
    <i class="fa-solid fa-plus"></i> Create First Funnel
  </button>
</div>
```

### Empty State CTA Reference

| Page | Empty State Title | CTA Label |
|------|-------------------|-----------|
| Funnels | No funnels created yet | + Create First Funnel |
| Tasks | No tasks assigned | + Add First Task |
| Inbox | No conversations yet | Connect a Channel |
| Pipelines | No deals in this stage | + Add Deal |
| Proposals | No proposals yet | + Create Proposal |
| Invoices | No invoices yet | + New Invoice |
| Contacts | No contacts added | + Import Contacts |
| Campaigns | No campaigns running | + New Campaign |
| Products | No products listed | + Add Product |
| Orders | No orders yet | View Products |
| Activity Feed | No activity yet | + Add First Contact |

---

## 10. Data Display Rules

### Stat / KPI Cards

Always displayed in a grid — minimum 3 columns, maximum 4 on desktop. Each card must have:

1. **Coloured top accent bar** (2px, uses semantic colour for that metric)
2. **Icon** in a tinted circle (icon colour + `rgba` background of same hue)
3. **Trend indicator** — even if `0`, show "neutral" badge, never omit
4. **Value** in Space Grotesk, 26px, 700 weight
5. **Label** — what this number represents
6. **Sub-label** — context or guidance text

```css
/* Stat card top accent */
.stat-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: var(--card-accent-colour);
  border-radius: 12px 12px 0 0;
}
```

### Money Values
- Always display in Space Grotesk font
- Always coloured `--amber` when showing revenue/balance
- Always coloured `--green` when showing paid/received amounts
- Always coloured `--red` when showing overdue amounts
- Format: `$12,000` not `$12000`, `$8.5K` for abbreviated display

### Percentage Values
- Always show `%` suffix
- Green if positive growth, Red if negative, Amber if neutral/waiting

### Count Values (0 state)
- Never show bare `0` — add helpful sub-text
- Example: `0` leads → sub-label: "Add your first contact to get started"

### Sparklines
- Add mini bar chart below stat values on dashboard cards
- Even for zero-state, render bars at 10% height (don't omit the chart)
- Use same semantic colour as the card accent

---

## 11. Forms & Inputs

### Input Field Style
```css
background: rgba(255, 255, 255, 0.05);
border: 1px solid var(--bdr);
border-radius: var(--r8);
padding: 9px 14px;
color: var(--t1);
font-family: 'DM Sans', sans-serif;
font-size: 13px;
outline: none;
transition: border-color 0.15s;

/* Placeholder */
::placeholder { color: var(--t3); }

/* Focus */
:focus { border-color: var(--accent); }
```

### Dropdown / Select
Same style as input. Add a chevron `▾` icon on the right. Never use native browser dropdown styling — always custom styled.

### Form Labels
```css
font-size: 11px;
font-weight: 600;
text-transform: uppercase;
letter-spacing: 0.6px;
color: var(--t3);
margin-bottom: 6px;
display: block;
```

### Field Groups
Fields grouped in 2-column grids with `14px` gap. Full-width fields for long content (description, notes, address).

### Date Fields
- Issue Date: defaults to today
- Due Date: defaults to +30 days with quick-select: Net 7 / Net 15 / Net 30 / Custom
- Never show raw `yyyy/mm/dd` placeholder — always pre-fill with a sensible default

---

## 12. Buttons

### Primary Button
```css
background: var(--accent);   /* #2563eb */
color: #ffffff;
border: none;
border-radius: var(--r8);
padding: 8px 18px;
font-size: 13px;
font-weight: 600;
font-family: 'DM Sans', sans-serif;
cursor: pointer;
transition: background 0.15s;

:hover { background: #1d4ed8; }
```

### Ghost Button
```css
background: rgba(255, 255, 255, 0.06);
color: var(--t2);
border: 1px solid var(--bdr);
border-radius: var(--r8);
padding: 8px 18px;
font-size: 13px;
font-weight: 600;

:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--t1);
}
```

### Danger Button (Delete / Destructive)
```css
background: rgba(239, 68, 68, 0.12);
color: var(--red);
border: 1px solid rgba(239, 68, 68, 0.25);

:hover { background: rgba(239, 68, 68, 0.22); }
```

### Icon Button (small square)
```css
width: 32px; height: 32px;
border-radius: var(--r8);
background: rgba(255, 255, 255, 0.05);
border: 1px solid var(--bdr);
display: flex; align-items: center; justify-content: center;
cursor: pointer;
font-size: 13px;
color: var(--t2);
transition: all 0.15s;

:hover { background: rgba(255,255,255,0.1); color: var(--t1); }
```

### Button Ordering Rule
On any toolbar or page header:
- **Always**: Ghost/secondary buttons first (left), Primary button last (rightmost)
- Primary button always has a `+` icon prefix for create actions

---

## 13. Badges & Status Labels

### Status Badge Pattern
```css
.badge {
  font-size: 10.5px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 20px;   /* pill shape */
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
```

### Status Colour Map

| Status | Background | Text |
|--------|-----------|------|
| Live / Active | `rgba(16,185,129,0.15)` | `#34d399` |
| Paid | `rgba(16,185,129,0.15)` | `#34d399` |
| Completed / Won | `rgba(16,185,129,0.15)` | `#34d399` |
| Draft | `rgba(139,92,246,0.15)` | `#a78bfa` |
| Sent / Info | `rgba(37,99,235,0.15)` | `#60a5fa` |
| New / Lead | `rgba(37,99,235,0.15)` | `#60a5fa` |
| Pending / In Review | `rgba(245,158,11,0.15)` | `#fbbf24` |
| Paused | `rgba(245,158,11,0.15)` | `#fbbf24` |
| Overdue / Error | `rgba(239,68,68,0.15)` | `#f87171` |
| Expired / Rejected | `rgba(239,68,68,0.15)` | `#f87171` |
| Negotiation | `rgba(245,158,11,0.15)` | `#fbbf24` |
| Proposal Stage | `rgba(139,92,246,0.15)` | `#a78bfa` |

### Priority Badges (Tasks)

| Priority | Background | Text |
|----------|-----------|------|
| High | `rgba(239,68,68,0.15)` | `#f87171` |
| Medium | `rgba(245,158,11,0.15)` | `#fbbf24` |
| Low | `rgba(16,185,129,0.15)` | `#34d399` |

### Count Badges (Sidebar)
```css
/* Notification count on nav items */
background: var(--accent);   /* tasks, messages */
background: var(--amber);    /* due today */
background: var(--green);    /* live/active */
font-size: 10px;
font-weight: 600;
padding: 2px 6px;
border-radius: 10px;
min-width: 18px;
text-align: center;
```

---

## 14. Cards & Panels

### Standard Card
```css
background: var(--card);   /* rgba(12,21,53,0.85) */
border: 1px solid var(--bdr);
border-radius: var(--r12);
overflow: hidden;
```

### Card Header
```css
display: flex; align-items: center; justify-content: space-between;
padding: 14px 18px;
border-bottom: 1px solid var(--bdr);
/* Title: 13px, 600 weight, icon in --accent2 */
/* Action link: 12px, --accent2, "View All →" */
```

### Card with Top Accent Bar
For stat cards and feature cards — a 2px coloured line at the very top:
```css
.card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: var(--accent-colour);
  border-radius: 12px 12px 0 0;
}
```

### Hover State (all clickable cards)
```css
transition: all 0.18s ease;
:hover {
  background: var(--card-hover);
  border-color: var(--bdrh);
  transform: translateY(-1px);
}
```

### Dashed "Add New" Card
Used as the last card in any grid for creating a new item:
```css
background: rgba(255, 255, 255, 0.03);
border: 1.5px dashed var(--bdr);
border-radius: var(--r12);
display: flex; flex-direction: column; align-items: center; justify-content: center;
gap: 10px; min-height: 200px; cursor: pointer;

:hover {
  background: rgba(37, 99, 235, 0.06);
  border-color: rgba(37, 99, 235, 0.3);
}
```

---

## 15. Kanban Boards

### Column Rules
- 4 standard columns: **To Do · In Progress · In Review · Done**
- Each column has a unique colour theme (top border + background tint)
- Each column header shows: coloured dot, column name, count badge
- Each column body: `min-height: 480px`, items stack vertically with `8px` gap
- "Add task" dashed button at the bottom of every column

### Column Colour Assignments
| Column | Border | Background tint | Dot |
|--------|--------|-----------------|-----|
| To Do | `rgba(245,158,11,0.12)` | `rgba(245,158,11,0.04)` | `--amber` |
| In Progress | `rgba(37,99,235,0.12)` | `rgba(37,99,235,0.04)` | `--accent2` |
| In Review | `rgba(139,92,246,0.12)` | `rgba(139,92,246,0.04)` | `--purple` |
| Done | `rgba(16,185,129,0.12)` | `rgba(16,185,129,0.04)` | `--green` |

### Task Card Contents (required fields)
1. Title (13px, 600 weight)
2. Priority badge (High / Med / Low) — top-right
3. Description — optional, 2 lines max, `--t2`
4. Tags — small `--accent` tinted pills
5. Due date — with calendar icon, red if overdue
6. Assignee avatar(s) — 22px circles, bottom right

### Done Column
- All task cards in Done column get `opacity: 0.7` and title `text-decoration: line-through`

---

## 16. Pipeline Boards

### Column Rules
- Standard 5 stages: **Lead · Contacted · Proposal · Negotiation · Closing**
- Each column shows: stage name, deal count, and **total $ value in that stage**
- Column width: `260px` fixed, horizontal scroll on overflow
- Add a pipeline summary bar above the board: Total Value | Active Deals | Avg Conversion Rate

### Deal Card Contents (required fields)
1. Coloured top bar (3px, stage colour)
2. Deal name (13px, 600 weight)
3. Contact name + company icon
4. Status note if relevant (e.g. "Proposal sent 2 days ago", "Price discussion pending")
5. Deal value in `--amber`, Space Grotesk 14px 700
6. Days in stage, bottom right

### Closing Column Empty State
Never show a blank column. Show:
```
🏆
Drag deals here
to mark as closing
```

### Pipeline Summary Bar Style
```css
/* Each summary pill */
background: rgba(255,255,255,0.04);
border: 1px solid var(--bdr);
border-radius: var(--r8);
padding: 8px 16px;
/* Icon + Value + Label stacked */
```

---

## 17. Split-Panel Pages

Used for: Proposals, Invoices, Inbox, Support tickets, Orders.

### Layout
```
┌──────────────┬─────────────────────────┐
│  LEFT PANEL  │   MAIN CONTENT AREA     │
│  300px       │   flex: 1               │
│  fixed width │                         │
│              │   ┌─────────────────┐   │
│  - Search    │   │  Document View  │   │
│  - Filter    │   │  or Thread      │   │
│  - Item List │   │  or Detail      │   │
│              │   └─────────────────┘   │
└──────────────┴─────────────────────────┘
```

### Left Panel Rules
- Width: `300px`, fixed
- `border-right: 1px solid var(--bdr)`
- Search input at top
- Filter pills below search
- Item list fills remaining height with `overflow-y: auto`
- Active item: `background: var(--accentg); border: 1px solid rgba(37,99,235,0.25)`
- Hover item: `background: rgba(255,255,255,0.04); border: 1px solid var(--bdr)`

### List Item Pattern
```
[Status Badge]    [Title]
[Client icon] Client Name
[$ Value]         [Date]
```

### Action Bar (bottom of main panel)
Every split-panel page has a sticky action bar at the bottom:
```css
padding: 14px 24px;
border-top: 1px solid var(--bdr);
background: var(--n800);
display: flex; gap: 8px;
/* Primary action leftmost, destructive action last or separated */
```

---

## 18. Inbox & Messaging UI

### Three-Panel Layout
```
[Channel Tabs + Conversation List | Thread | Contact Info Panel]
       280px                         flex:1        240px
```

### Channel Tab Icons
| Channel | Icon | Active Colour |
|---------|------|--------------|
| All | "All" text | `--accent` background |
| SMS | `fa-comment-sms` | `--green` tint |
| Email | `fa-envelope` | `--accent2` tint |
| Facebook | `fa-brands fa-facebook-messenger` | `--accent2` tint |
| Instagram | `fa-brands fa-instagram` | `--pink` tint |
| WhatsApp | `fa-brands fa-whatsapp` | `rgba(37,211,102,0.12)` |

### Conversation List Items
- Unread indicator: `5px` dot on left edge, `--accent2` colour
- Avatar: 36px circle, initials, colour-coded by contact
- Preview text: 1 line, `--t2`, truncated
- Channel indicator: icon + channel name, bottom of item, tiny 10px

### Message Bubbles
```css
/* Incoming */
background: rgba(255,255,255,0.07);
border: 1px solid var(--bdr);
border-radius: 12px;
padding: 10px 14px;

/* Outgoing */
background: var(--accentg);
border: 1px solid rgba(37,99,235,0.2);
border-radius: 12px;
padding: 10px 14px;
align-self: flex-end;
```

### Reply Box
```
[ Textarea (auto-grow, min 44px) | Attach | Templates | AI Assist | Send▶ ]
```
Send button: `--accent` background, always rightmost.

### Right Contact Panel (Inbox)
Always shows: Contact info, Pipeline stage, Tags, Quick Actions (Send Proposal, Book Meeting, Add Task)

---

## 19. Modals & Dialogs

### Overlay
```css
background: rgba(4, 9, 26, 0.75);
backdrop-filter: blur(4px);
position: fixed; inset: 0;
z-index: 500;
display: flex; align-items: center; justify-content: center;
```

### Modal Card
```css
background: var(--n800);
border: 1px solid var(--bdrh);
border-radius: var(--r16);
width: 520px;   /* default */
max-height: 85vh;
overflow-y: auto;
padding: 28px;
```

### Modal Header
```
[Icon] Modal Title                           [✕ close]
Subtitle or description in --t2
```

### Modal Footer
```
[Cancel (ghost)]          [Confirm (primary)]
```
Always right-aligned. Cancel on left, confirm on right.

### Destructive Confirm Modal
If confirming a delete/destructive action:
- Modal border: `1px solid rgba(239,68,68,0.25)`
- Confirm button: danger style (red background)
- Warning text in red at top of modal body

---

## 20. Notifications & Toasts

### Toast Position
Bottom-right corner, `24px` from edges, stacks upward.

### Toast Variants
```css
/* Success */
border-left: 3px solid var(--green);
background: rgba(16,185,129,0.1);
icon: fa-circle-check, color: var(--green)

/* Error */
border-left: 3px solid var(--red);
background: rgba(239,68,68,0.1);
icon: fa-circle-xmark, color: var(--red)

/* Info */
border-left: 3px solid var(--accent2);
background: var(--accentg);
icon: fa-circle-info, color: var(--accent2)

/* Warning */
border-left: 3px solid var(--amber);
background: rgba(245,158,11,0.1);
icon: fa-triangle-exclamation, color: var(--amber)
```

### Toast Structure
```
[Icon]  Title (13px, 600)                   [✕]
        Description (12px, --t2)
```
Auto-dismiss: 4 seconds. Width: 340px.

---

## 21. Icons

**Library:** Font Awesome 6 Free (Solid + Brands)
**CDN:**
```html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
```

### Icon Size Rules
| Context | Size |
|---------|------|
| Nav sidebar items | 15px |
| Card titles | 13–14px |
| Inline with text | 12–13px |
| Stat card icons | 16px |
| Empty state icons | 28px |
| Topbar icon buttons | 13–14px |

### Icon Colour Rules
- Nav icons default: `--t3`
- Nav icons hover/active: match text colour
- Card title icons: `--accent2`
- Success icons: `--green`
- Warning icons: `--amber`
- Error icons: `--red`
- Info icons: `--accent2`
- Empty state icons: `--t3` at `opacity: 0.5`

### Standard Icon Assignments
| Feature | Icon |
|---------|------|
| Dashboard | `fa-gauge-high` |
| Tasks | `fa-list-check` |
| Inbox | `fa-inbox` |
| Contacts | `fa-users` |
| Pipelines | `fa-filter` |
| Proposals | `fa-file-contract` |
| Invoices | `fa-file-invoice-dollar` |
| Calendars | `fa-calendar-days` |
| Waitlists | `fa-clock-rotate-left` |
| Websites | `fa-globe` |
| Funnels | `fa-chart-line` |
| Campaigns | `fa-paper-plane` |
| Forms | `fa-wpforms` |
| Social | `fa-share-nodes` |
| Reputation | `fa-star` |
| Ads | `fa-bullhorn` |
| Products | `fa-bag-shopping` |
| Orders | `fa-box` |
| Expenses | `fa-receipt` |
| Projects | `fa-diagram-project` |
| Support | `fa-headset` |
| Automations | `fa-bolt` |
| Learning | `fa-graduation-cap` |
| Certificates | `fa-certificate` |
| Community | `fa-people-group` |
| Media Center | `fa-photo-film` |
| Reporting | `fa-chart-pie` |
| Settings | `fa-gear` |
| Revenue | `fa-dollar-sign` |
| Won/Trophy | `fa-trophy` |
| Growth | `fa-arrow-trend-up` |
| Target | `fa-bullseye` |
| Activity | `fa-wave-square` |

---

## 22. Animation & Transitions

### Standard Transition
```css
transition: all 0.15s ease;   /* buttons, nav items, hover states */
transition: all 0.18s ease;   /* cards on hover */
transition: all 0.25s ease;   /* sidebar collapse, menus */
```

### Hover Lift (Cards)
```css
transform: translateY(-1px);   /* subtle — not -3px or more */
```

### Chevron Rotation (Dropdowns)
```css
.chevron { transition: transform 0.2s ease; }
.open .chevron { transform: rotate(180deg); }
```

### Sidebar Collapse
```css
transition: width 0.25s ease;
```

### No Heavy Animations
- No `animation-duration` over `0.4s` for UI interactions
- No bounce or spring effects on form elements
- No parallax effects
- Fade-in on page load is acceptable: `opacity 0 → 1` over `0.3s`

---

## 23. Prohibited Patterns

The following are **strictly forbidden** in LeadsMind UI. If you see these, fix them.

| ❌ Prohibited | ✅ Use instead |
|--------------|---------------|
| White or light backgrounds | Navy backgrounds (`--n800`, `--n900`) |
| Pure black (`#000`) backgrounds | `--n900` (#04091a) |
| Generic grey cards | `var(--card)` rgba navy cards |
| Bare `0` in stat cards | `0` + helpful sub-label |
| Blank/empty white box for no-data | Structured empty state with icon + CTA |
| Random colour choices | Semantic colour map from Section 2 |
| Arial, Roboto, or system fonts | DM Sans + Space Grotesk only |
| Purple gradients on white | Not applicable — this is a dark UI |
| Unnamed Kanban columns | To Do / In Progress / In Review / Done |
| Pipeline columns with no $ total | Always show total value per stage |
| "SELECT AN INVOICE" giant text | Use structured empty state with CTA |
| "NO PROPOSALS" small grey text | Use structured empty state with CTA |
| "CLICK TO CREATE YOUR FIRST FUNNEL" | Funnel card grid with Add New card |
| Button order: Primary then Ghost | Always: Ghost(s) first, Primary last |
| Rename "Commit Invoice" | Use "Finalise Invoice" or "Mark as Issued" |
| Dropdowns without styled custom UI | Always custom-styled dropdowns |
| Raw `yyyy/mm/dd` date placeholders | Pre-fill with sensible defaults |
| Full-width page that ignores sidebar | All content accounts for sidebar width |
| Page with no toolbar/filter options | Add filter pills and/or view toggle |
| `box-shadow` heavy glows or neons | Stick to subtle border-based depth |
| Text on coloured background in wrong colour | Always use tinted text matching the bg hue |

---

## 24. New Feature Checklist

Before marking any feature as complete, verify every item:

### Layout ✓
- [ ] Page follows the standard template (header → toolbar → content)
- [ ] Page title uses two-word format with accent colour on second word
- [ ] Subtitle is present in uppercase tracking style
- [ ] Page header has ghost buttons + one primary action button (rightmost)
- [ ] Toolbar has filter pills and view toggle where applicable
- [ ] Sidebar includes the feature in the correct nav section with correct icon
- [ ] Sidebar item has dropdown if feature has sub-pages
- [ ] Content fits within page (accounts for sidebar + topbar)

### Colours & Theme ✓
- [ ] All backgrounds use CSS variables (no hardcoded navy/dark colours)
- [ ] Accent colour is `--accent` (`#2563eb`) only
- [ ] Money values use `--amber`
- [ ] Success/paid/live states use `--green`
- [ ] Error/overdue/danger states use `--red`
- [ ] Draft/pending-creative states use `--purple`
- [ ] No white, grey, or light backgrounds anywhere

### Typography ✓
- [ ] Headings and numbers use Space Grotesk
- [ ] Body, labels, and UI text use DM Sans
- [ ] Font weights are 400, 500, 600, or 700 only

### Components ✓
- [ ] All buttons follow correct style (primary / ghost / danger)
- [ ] All status values use the correct badge colour from Section 13
- [ ] Cards have correct background, border, and border-radius
- [ ] Hover states are defined for all interactive elements
- [ ] Icons are Font Awesome 6 at correct size

### Data & States ✓
- [ ] Empty state is fully implemented (icon + title + description + CTA)
- [ ] Loading state is defined (skeleton or spinner)
- [ ] Zero-value stats have helpful sub-labels
- [ ] Error states are handled (toast or inline message)
- [ ] All dates have sensible defaults or formatting

### Kanban / Pipeline Specifics ✓
- [ ] Kanban columns are named (not just coloured dots)
- [ ] Pipeline columns show total $ value in header
- [ ] All stage colours match the colour map in Section 2

### Split Panels ✓
- [ ] Left panel is 300px with search + filter + list
- [ ] Active item has blue tint highlight
- [ ] Action bar is at the bottom of the main panel
- [ ] Document/detail view is centred with max-width

---

## 25. Engineering: Component Atomicity & File Limits

To maintain a high-velocity, maintainable codebase, **Antigravity must follow a "Small-File First" architecture.** ### The 300-Line Circuit Breaker

* **Strict Limit:** No single file should exceed **300 lines of code**.
* **The Action:** If a component or page is approaching 250 lines, Antigravity **must** pause and refactor sub-elements into a `components/` subdirectory within that module.
* **Exceptions:** Extremely complex configuration files or large SVG sprite maps (though these should ideally be separate assets).

### Decomposition Hierarchy

When building a new feature (e.g., the **School Management System** or **Leadsmind UI**), break the UI down as follows:

| Level | Content | Target Length |
| --- | --- | --- |
| **Page** (`page.tsx`) | Layout wrapper, high-level state, and major sections only. | < 150 lines |
| **Section** (`/sections/`) | Large UI blocks like a "Financial Summary" or "Student List Table". | < 200 lines |
| **Component** (`/components/`) | Reusable atoms like Custom Modals, Form Groups, or Stat Cards. | < 100 lines |
| **Logic** (`/hooks/`) | Move complex `useEffect` or `useState` logic into custom hooks. | < 100 lines |

### Implementation Rules

1. **Implicit Refactoring:** Do not ask for permission to create a new file once the 300-line limit is reached. Extract the logic and export/import it automatically.
2. **Prop Drilling vs. Context:** If a component is split into more than 3 sub-components, evaluate if a local `Context` or `Zustand` store is cleaner than passing props down multiple levels.
3. **Tailwind Hygiene:** If a component’s Tailwind class string exceeds 50% of the line length, extract those styles into a constant or a reusable `cn()` utility to keep the JSX readable.
4. **Naming Convention:** Sub-components extracted from a main page should be named `[PageName][Role].tsx` (e.g., `InvoicesTable.tsx`, `InvoicesFilterBar.tsx`).

---

> **Last Updated:** May 2026
> **Version:** 1.0 — LeadsMind Design System
> **Maintained by:** GulfBridge Workspace
>
> This document is the single source of truth. When in doubt, refer back here. Do not deviate from these patterns without updating this document first.
