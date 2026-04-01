# MarketingWiz Agency Portal

A modern agency management portal built with React, Vite, and Tailwind CSS, following "The Kinetic Editorial" design system.

## Features

- **Authentication**: Login page with role-based routing
- **Admin Dashboard**: Overview of firms, tickets, transcripts, and team workload
- **Member Dashboard**: Personal ticket management and time tracking
- **Ticket Management**: Create, view, and manage tickets with priority levels
- **Transcript Processing**: AI-powered transcript to ticket conversion
- **Firm Management**: Client organization tracking
- **Team Management**: Team member workload and capacity monitoring

## Tech Stack

- **React 18** - UI library
- **Vite** - Build tool and dev server
- **React Router v6** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Material Symbols** - Icon library

## Design System

The project follows "The Kinetic Editorial" design philosophy:

- **Primary Color**: Orange (#C84B0E)
- **Dark Sidebar**: #111111
- **No-Line Philosophy**: Uses background shifts instead of borders
- **Typography**: Inter font family
- **Surface Hierarchy**: Layered paper-like UI

## Getting Started

### Prerequisites

- Node.js 16+ and npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
src/
├── components/          # Shared components
│   ├── Sidebar.jsx     # Navigation sidebar
│   └── TopNav.jsx      # Top navigation bar
├── pages/              # Page components
│   ├── Login.jsx       # Login page
│   ├── admin/          # Admin pages
│   │   ├── Dashboard.jsx
│   │   ├── TicketList.jsx
│   │   ├── TicketDetail.jsx
│   │   ├── TranscriptsList.jsx
│   │   ├── TranscriptProcessing.jsx
│   │   ├── FirmsList.jsx
│   │   └── TeamList.jsx
│   └── member/         # Member pages
│       ├── Dashboard.jsx
│       ├── TicketList.jsx
│       └── TicketDetail.jsx
├── App.jsx             # Main app component with routing
├── main.jsx            # App entry point
└── index.css           # Global styles

```

## Demo Credentials

For testing purposes, the login page routes based on email:

- **Admin Access**: Use any email containing "admin" (e.g., admin@example.com)
- **Member Access**: Use any other email (e.g., member@example.com)

## Available Routes

### Public Routes
- `/login` - Login page

### Admin Routes
- `/admin/dashboard` - Admin dashboard
- `/admin/tickets` - All tickets list
- `/admin/tickets/:id` - Ticket detail view
- `/admin/transcripts` - Transcripts list
- `/admin/transcripts/process` - Process transcript
- `/admin/firms` - Client firms list
- `/admin/team` - Team management

### Member Routes
- `/member/dashboard` - Member dashboard
- `/member/tickets` - My tickets list
- `/member/tickets/:id` - Ticket detail view

## Development Notes

- The project uses Tailwind CSS with a custom color palette matching the design system
- Material Symbols Outlined icons are loaded from Google Fonts
- The sidebar navigation automatically highlights the active route
- All pages follow the "No-Line" design philosophy with background shifts for visual hierarchy

## Next Steps

To complete the implementation:

1. Add state management (Context API or Redux)
2. Implement API integration
3. Add authentication logic
4. Complete remaining page implementations
5. Add modals for ticket creation and editing
6. Implement the transcript processing workflow
7. Add data visualization for analytics

## License

Private - All rights reserved
