# MarketingWiz Agency Portal - Complete HTML Reference

This document consolidates all HTML prototypes from the three stitch folders for easy reference during React implementation.

## User Flow & Organization

### Phase 1: Authentication & Entry
- **Step 1: Access Portal** - Login Page ✅ IMPLEMENTED
- **Step 2: Admin Gateway** - Admin Dashboard ✅ IMPLEMENTED
- **Step 3: Member Gateway** - Member Dashboard ✅ IMPLEMENTED

### Phase 2: Transcript Processing (Admin Only)
- **Step 4: View Transcripts** - Transcripts List (TODO)
- **Step 5: AI Processing Session** - Active Processing Panel (TODO)
- **Step 6: Handle Draft Tickets** - Regenerate Ticket Modal (TODO)

### Phase 3: Client & Firm Management (Admin Only)
- **Step 7: Firm Ecosystem** - Firms List (TODO)
- **Step 8: Onboard New Firm** - Add New Firm Form (TODO)
- **Step 9: Firm Operations Detail** - Firm Detail with Tickets Tab (TODO)

### Phase 4: Ticket Lifecycle & Approval
- **Step 10: Assign to Agent** - Assign & Approve Modal (TODO)
- **Step 11: Approval Confirmation** - Ticket Approved Confirmation (TODO)
- **Step 12: Master Queue Oversight** - All Tickets Master List (TODO)

### Phase 5: Agent/Member Workflow
- **Step 13: Personal Task List** - Member Ticket List ✅ IMPLEMENTED
- **Step 14: Active Task Management** - Member Ticket Detail ✅ IMPLEMENTED
- **Step 15: Task Resolution** - Resolution Modal (TODO)

### Phase 6: Team Administration
- **Step 16: Agency Roster** - Team List (TODO)
- **Step 17: Individual Performance** - Team List + User Detail (TODO)
- **Step 18: Profile Management** - Edit Member Profile (TODO)

### Additional Features
- **Admin Ticket Detail** - ✅ IMPLEMENTED

## Table of Contents
1. [Login Page](#login-page)
2. [Admin Dashboard](#admin-dashboard)
3. [Member Dashboard](#member-dashboard)
4. [Ticket Management](#ticket-management)
5. [Transcript Management](#transcript-management)
6. [Team & Firm Management](#team--firm-management)
7. [Modals & Forms](#modals--forms)

---

## Design System Reference

### Color Palette
- **Primary Orange**: `#C84B0E` (primary-container)
- **Dark Sidebar**: `#111111`
- **Surface Background**: `#F9F9F7`
- **Surface Container**: `#EEEEEC`

### Typography
- **Font Family**: Inter
- **Headings**: Bold, tracking-tight
- **Labels**: Uppercase, tracking-widest, font-bold

### Design Philosophy
- **No-Line Principle**: Use background shifts instead of borders
- **Kinetic Editorial**: Subtle animations and transitions
- **Material Symbols**: Outlined icons

---

## 1. Login Page

**Source**: `stitch_marketingwiz_login/marketingwiz_login/code.html`

### Key Features
- Centered login card with brand identity
- Email and password fields with icons
- Remember me checkbox
- Forgot password link
- Decorative gradient background elements

### Layout Structure
```
- Main container (centered, flex)
  - Brand logo (MW in orange box)
  - Login header
  - Login card
    - Email field (with mail icon)
    - Password field (with lock icon, visibility toggle)
    - Remember me checkbox
    - Sign in button
  - Support footer
  - Copyright
```

---

## 2. Admin Dashboard

**Sources**: 
- `stitch_marketingwiz_login/admin_dashboard/code.html`
- `stitch_marketingwiz_login/refined_admin_dashboard/code.html`

### Key Features
- 5 stat cards (Total Firms, Total Tickets, Pending, Approved, Team Members)
- Recent Transcripts table with Process/Archive actions
- Team Workload visualization (progress bars with 80% threshold)
- Overdue Tickets panel

### Layout Structure
```
- Sidebar (fixed left)
- Main content area
  - TopNav (sticky)
  - Dashboard grid
    - Row 1: 5 stat cards (grid-cols-5)
    - Row 2: Recent Transcripts table
    - Row 3: Team Workload (60%) + Overdue Tickets (40%)
```

### Stat Cards
Each card has:
- Label (uppercase, small, bold)
- Large number (3xl, extrabold)
- Optional trend indicator or icon
- Border-left accent color

### Team Workload
- Progress bars with color coding:
  - Green: < 40%
  - Blue: 40-70%
  - Amber: 70-90%
  - Red: > 90%
- 80% threshold marker line

---

## 3. Member Dashboard

**Sources**:
- `stitch_marketingwiz_login/member_dashboard/code.html`
- `stitch_marketingwiz_login (1)/stitch_marketingwiz_login/refined_member_dashboard_team_view/code.html`

### Key Features
- 3 stat cards (Assigned Tickets, Pending Tickets, Total Time Logged)
- Empty state with icon and CTA
- Simplified navigation (Dashboard, Tickets only)

### Layout Structure
```
- Sidebar (simplified, 2 nav items)
- Main content
  - TopNav with user info
  - 3 stat cards (grid-cols-3)
  - Empty state area (centered)
```

---

## 4. Ticket Management

### 4.1 All Tickets List (Admin)

**Source**: `stitch_marketingwiz_login/all_tickets_master_list_admin/code.html`

#### Key Features
- Advanced filter bar (5 filters + date picker)
- Comprehensive table with 10 columns
- Pagination
- Status badges (Draft, Approved, Resolved)
- Priority badges (Low, Medium, High, Urgent)

#### Table Columns
1. Title
2. Firm
3. Assigned To (with avatar)
4. Type
5. Priority
6. Est. Time
7. Spent Time
8. Status
9. Created Date
10. Action (View link)

### 4.2 Member Ticket List

**Sources**:
- `stitch_marketingwiz_login/member_ticket_list/code.html`
- `stitch_marketingwiz_login (1)/stitch_marketingwiz_login/simplified_member_ticket_list/code.html`

#### Key Features
- Search bar in TopNav
- 4 stat cards (Total Assigned, In Progress, Avg Resolve Time, Efficiency Rate)
- Simplified table (6 columns)
- Export button

#### Table Columns
1. Title (with ticket ID)
2. Firm
3. Priority
4. Est. Time
5. Spent Time
6. Status

### 4.3 Member Ticket Detail

**Source**: `stitch_marketingwiz_login/member_ticket_detail_page/code.html`

#### Key Features
- Breadcrumb navigation
- Two-column layout (60/40 split)
- Left column:
  - Ticket details card
  - Time allocation input
  - Time history table with inline add form
- Right column:
  - Resolution status card
  - Associated assets list with upload area

#### Layout Structure
```
- Breadcrumb (back to My Tickets)
- Page title
- Two-column grid (grid-cols-10)
  - Left (col-span-6):
    - Ticket details (firm, type, priority, status, description, admin note)
    - Time allocation
    - Time history table
  - Right (col-span-4):
    - Resolution status with notes textarea
    - Mark as Resolved button
    - Associated assets with file list
    - Upload area
```

### 4.4 Admin Ticket Detail

**Sources**:
- `stitch_marketingwiz_login (2)/stitch_marketingwiz_login/admin_ticket_detail_view_1/code.html`
- `stitch_marketingwiz_login (2)/stitch_marketingwiz_login/admin_ticket_detail_view_2/code.html`

#### Key Features (to be implemented)
- Breadcrumb navigation
- Ticket header with metadata
- Two-column layout (70/30 split)
- Left column:
  - Ticket metadata card
  - Description with deliverables
  - Activity log timeline
  - Comment input area
- Right column:
  - Quick actions (Edit, Regenerate, Resolve)
  - Related files
  - Firm health card

---

## 5. Transcript Management

### 5.1 Transcripts List

**Source**: `stitch_marketingwiz_login/transcripts_list/code.html`

#### Key Features
- Search bar
- Show Archived toggle
- Sync status indicator
- Table with Process/Archive actions
- Pagination

#### Table Columns
1. Call Title (with icon)
2. Date
3. Duration
4. Participants (avatar stack)
5. Action (Archive button, Process button)

### 5.2 Transcript Processing

**Source**: `stitch_marketingwiz_login/processing_panel/code.html`
**Source**: `stitch_marketingwiz_login (1)/stitch_marketingwiz_login/active_processing_panel/code.html`

#### Key Features (to be implemented)
- Transcript viewer
- AI processing controls
- Ticket generation interface
- Firm selection
- Priority assignment

---

## 6. Team & Firm Management

### 6.1 Firms List

**Source**: `stitch_marketingwiz_login (1)/stitch_marketingwiz_login/firms_list_admin/code.html`

#### Key Features (to be implemented)
- Firm cards or table
- Add new firm button
- Firm details view
- Ticket count per firm

### 6.2 Firm Detail Views

**Sources**:
- `stitch_marketingwiz_login (1)/stitch_marketingwiz_login/firm_detail_ticket_list_view/code.html`
- `stitch_marketingwiz_login (1)/stitch_marketingwiz_login/firm_detail_approved_tickets_with_priority/code.html`
- `stitch_marketingwiz_login (1)/stitch_marketingwiz_login/edit_firm_acme_corp/code.html`

### 6.3 Team List

**Sources**:
- `stitch_marketingwiz_login/team_list_user_detail_admin/code.html`
- `stitch_marketingwiz_login (1)/stitch_marketingwiz_login/refined_team_list_admin/code.html`

#### Key Features (to be implemented)
- Team member cards or table
- Role badges
- Workload indicators
- Edit member button

### 6.4 Edit Member Profile

**Sources**:
- `stitch_marketingwiz_login (2)/stitch_marketingwiz_login/edit_member_profile_admin_view_1/`
- `stitch_marketingwiz_login (2)/stitch_marketingwiz_login/edit_member_profile_admin_view_2/code.html`
- `stitch_marketingwiz_login (2)/stitch_marketingwiz_login/edit_member_profile_sarah_chen/code.html`

---

## 7. Modals & Forms

### 7.1 Resolution Modal (Member)

**Source**: `stitch_marketingwiz_login/resolution_modal_member/code.html`
**Source**: `stitch_marketingwiz_login/refined_resolution_modal/code.html`

### 7.2 Regenerate Ticket Modal

**Source**: `stitch_marketingwiz_login/regenerate_ticket_modal/code.html`
**Source**: `stitch_marketingwiz_login/refined_regenerate_ticket_modal/code.html`

### 7.3 Create New Ticket Modal

**Source**: `stitch_marketingwiz_login (1)/stitch_marketingwiz_login/create_new_ticket_modal/code.html`

### 7.4 Edit Ticket Modal

**Source**: `stitch_marketingwiz_login (1)/stitch_marketingwiz_login/edit_ticket_modal_admin/code.html`

### 7.5 Add New Firm Form

**Source**: `stitch_marketingwiz_login (2)/stitch_marketingwiz_login/add_new_firm_form/code.html`

### 7.6 Assign & Approve with Priority Selection

**Sources**:
- `stitch_marketingwiz_login (1)/stitch_marketingwiz_login/assign_approve_with_priority_selection_1/code.html`
- `stitch_marketingwiz_login (1)/stitch_marketingwiz_login/assign_approve_with_priority_selection_2/code.html`

### 7.7 Confirmation Modals

**Sources**:
- `stitch_marketingwiz_login (1)/stitch_marketingwiz_login/admin_ticket_confirmation/code.html`
- `stitch_marketingwiz_login (1)/stitch_marketingwiz_login/ticket_approved_confirmation/code.html`

---

## Common Components

### Sidebar Navigation
```jsx
- Fixed left, width: 240px
- Dark background: #111111
- Brand section (top)
- Navigation links with icons
- Active state: left border (4px, orange) + bg-white/5
- Logout at bottom
```

### TopNav
```jsx
- Sticky top, height: 56-64px
- White background
- Page title (left)
- Actions (right): notifications, settings, user avatar
- Optional: search bar
```

### Stat Cards
```jsx
- Background: surface-container-lowest
- Padding: p-6 or p-8
- Border-left accent (4px)
- Label: uppercase, small, bold, text-on-surface-variant
- Value: text-3xl or larger, font-extrabold
- Optional: trend indicator, icon
```

### Tables
```jsx
- Container: bg-surface-container-lowest, rounded-xl
- Header: bg-surface-container-high, uppercase labels
- Rows: hover:bg-surface-container-low
- Dividers: divide-y divide-surface-container-low (subtle)
- Pagination footer
```

### Badges
```jsx
Priority:
- Low: bg-surface-container-high, text-on-surface-variant
- Medium: bg-tertiary/10, text-tertiary
- High: bg-error/10, text-error
- Urgent: bg-on-error-container, text-error

Status:
- Draft: bg-surface-container-high, text-on-surface-variant
- In Progress: bg-tertiary-fixed, text-on-tertiary-fixed-variant, animated dot
- Approved: bg-emerald-100, text-emerald-700
- Resolved: text with check_circle icon
```

---

## Implementation Priority

Based on the conversation summary, implement in this order:

1. ✅ Login Page
2. ✅ Admin Dashboard
3. ✅ Member Dashboard
4. ✅ Member Ticket List
5. **🔄 Admin Ticket Detail** (CURRENT - in progress)
6. Member Ticket Detail
7. All Tickets List (Admin)
8. Transcripts List
9. Transcript Processing
10. Firms List
11. Team List
12. Modals and Forms

---

## Notes

- All HTML files use Tailwind CSS with custom color tokens
- Material Symbols Outlined icons throughout
- Consistent spacing and typography
- Responsive grid layouts
- Hover states and transitions for interactivity
- No-line design philosophy (background shifts vs borders)

