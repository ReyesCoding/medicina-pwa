# UTESA Medical Curriculum Planner - Design Guidelines

## Design Approach
**Selected Framework:** Productivity-focused design system inspired by Linear and Notion, optimized for information density and dark-mode professional aesthetics.

**Core Principle:** Create a focused academic planning environment where complex scheduling data remains scannable and actionable through strategic hierarchy and contrast.

## Color Palette

### Dark Mode Foundation
- **Background Primary:** 220 15% 8% (main canvas)
- **Background Secondary:** 220 15% 12% (cards, panels)
- **Background Tertiary:** 220 15% 16% (hover states, elevated surfaces)
- **Border Subtle:** 220 10% 20%
- **Border Emphasis:** 220 10% 30%

### Medical Professional Accent
- **Primary (Medical Blue):** 210 100% 60% (CTAs, active states)
- **Primary Hover:** 210 100% 55%
- **Success (Completed):** 142 70% 50%
- **Warning (Conflicts):** 35 100% 60%
- **Error (Prerequisites Missing):** 0 85% 60%
- **Info (Optional Courses):** 200 95% 65%

### Text Hierarchy
- **Primary Text:** 220 10% 95%
- **Secondary Text:** 220 8% 70%
- **Tertiary Text:** 220 8% 50%
- **Disabled Text:** 220 8% 35%

## Typography
- **Primary Font:** Inter (Google Fonts)
- **Monospace (Course Codes):** JetBrains Mono (Google Fonts)

**Scale:**
- Headers H1: text-3xl font-semibold (Dashboard titles)
- Headers H2: text-2xl font-semibold (Section headers)
- Headers H3: text-xl font-medium (Card titles)
- Body: text-base (Main content)
- Small: text-sm (Metadata, labels)
- Tiny: text-xs (Badges, timestamps)

## Layout System
**Spacing Primitives:** Standardize on 2, 4, 6, 8, 12, 16 tailwind units

- Component padding: p-4 to p-6
- Section gaps: gap-6 to gap-8
- Page margins: Container max-w-7xl with px-6
- Card spacing: space-y-4 internally

**Grid Structure:**
- Main dashboard: Sidebar (w-64) + Content area (flex-1)
- Course grid: 3 columns on desktop (lg:grid-cols-3), 2 on tablet (md:grid-cols-2), 1 on mobile
- Schedule view: Full-width timeline with scrollable horizontal terms

## Component Library

### Navigation
**Sidebar Navigation:**
- Fixed left sidebar (w-64) with background-secondary
- Navigation items with hover:background-tertiary transition
- Active state: border-l-2 border-primary with background-tertiary
- Icon + label layout with pl-4
- Bottom section for user profile and settings

**Top Bar:**
- Fixed header with backdrop-blur-sm bg-background-primary/80
- Current term indicator (dropdown)
- Quick actions (Add Course, Export Schedule)
- User avatar and notifications

### Course Cards
**Standard Course Card:**
- Background-secondary with border-subtle
- Hover: border-emphasis + subtle shadow
- Header: Course code (monospace, text-primary) + Credits badge
- Title: text-lg font-medium
- Prerequisites: Small badges with icon indicators
- Status badge (top-right): Completed (green), In Progress (blue), Pending (gray), Conflict (red)
- Footer: Term indicator + enrollment status

### Interactive Elements

**Dropdowns:**
- Distinct border-emphasis on focus
- Background-tertiary for dropdown items
- Hover state: Background-primary with text-primary
- Selected: Primary color indicator (left border or checkmark)
- Clear visual separation between groups

**Badges:**
- Rounded-full px-3 py-1 text-xs font-medium
- Color-coded backgrounds with 20% opacity
- Contrasting text (use lighter shade of badge color)
- Types: Term badges, status badges, credit counts, prerequisite indicators

**Buttons:**
- Primary: bg-primary text-white with hover:bg-primary-hover
- Secondary: border-2 border-primary text-primary hover:bg-primary/10
- Ghost: text-secondary hover:bg-tertiary
- Disabled: opacity-40 cursor-not-allowed

### Schedule Planning Interface

**Term Timeline:**
- Horizontal scrollable view with 18 term columns
- Each term: bg-background-secondary rounded-lg with p-4
- Term headers: Bold with term number + date range
- Drag-and-drop zones with dashed borders when active
- Conflict indicators: Red pulsing border on conflicting courses

**Conflict Detection Panel:**
- Sidebar panel (right side, slide-in)
- Lists all detected conflicts with clear descriptions
- Quick-fix suggestions with action buttons
- Visual indicators linking to problematic courses

### Progress Tracking

**Dashboard Widgets:**
- Overall Progress Ring: Large circular progress (200px diameter) with percentage
- Credits Counter: Current/Total with visual bar
- Term Completion Grid: 18-term grid with color-coded completion status
- Upcoming Deadlines: List with date + course + action needed

**Analytics Cards:**
- GPA Tracker (if applicable)
- Credit Distribution by term (bar chart)
- Prerequisite Chain Visualization (tree diagram)
- Completion Forecast timeline

### Data Tables
- Alternating row backgrounds (subtle: background-primary/background-secondary)
- Sortable headers with arrow indicators
- Fixed header on scroll
- Row hover: background-tertiary
- Selected row: border-l-4 border-primary

## Animations & Interactions
**Minimal Motion Philosophy:** Use animations only for feedback and state changes

- Transitions: duration-200 ease-in-out for all hovers
- Page transitions: Fade-in with slide-up (20px)
- Modal overlays: backdrop blur + fade
- Drag operations: Subtle scale (95%) on drag start
- Success states: Single checkmark fade-in
- Loading states: Subtle pulse on skeleton screens

## Accessibility in Dark Mode
- Ensure all form inputs have visible borders (border-emphasis)
- Focus rings: 2px solid primary color with 2px offset
- Dropdowns: Distinct background-tertiary with clear borders
- Text inputs: Background-tertiary with border-subtle, focus:border-primary
- Checkboxes/Radio: Custom styled with high contrast
- All interactive elements minimum 44px touch target

## Layout Sections

### Dashboard (Home)
- Top: Welcome header + current term selector + quick stats
- Left: Sidebar navigation
- Center: 2-column grid (Progress widgets + Recent activity)
- Right: Quick actions panel (Add course, View conflicts, Export)

### Course Management
- Search/filter bar with term and category filters
- Course grid (3 columns) with sorting options
- Course detail modal: Full course info, prerequisites graph, add to schedule button

### Schedule Planner
- Full-width horizontal timeline (18 terms)
- Drag-and-drop course cards between terms
- Right panel: Course library (filterable)
- Bottom panel: Conflict warnings (collapsible)

### Progress Tracker
- Top: Overall statistics row (4 cards)
- Middle: Term-by-term breakdown (grid view)
- Bottom: Detailed analytics charts

## Images
**No Hero Image Required** - This is a utility application, not a marketing page. Focus on data visualization and functional UI.

**Icon Usage:**
- Use lucide-react throughout for consistency
- Course categories: Custom medical-themed icons (Stethoscope, Book, Flask, Brain, etc.)
- Navigation: Standard icons (Dashboard, Calendar, BarChart, Settings)
- Actions: Plus, Trash, Edit, Download icons

**Data Visualization:**
- Use chart libraries (Chart.js) for progress graphs
- Prerequisite trees rendered with connecting lines
- Color-coded term completion grids