# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an ESS Check-in System - a web application for managing student check-ins at educational programs. It provides public check-in interfaces, administrative dashboards, and analytics features.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: TanStack Query (React Query)
- **Backend**: Supabase (PostgreSQL database + Auth + Real-time)
- **Routing**: React Router DOM
- **Forms**: React Hook Form + Zod validation

## Common Development Commands

```bash
# Start development server
npm run dev

# Build for production  
npm run build

# Run linting
npm run lint

# Preview production build
npm run preview
```

## Architecture

### Key Directories
- `/src/components/` - Reusable UI components (mostly shadcn/ui)
- `/src/pages/` - Route-based page components
- `/src/integrations/supabase/` - Supabase client and types (auto-generated)
- `/src/contexts/` - React contexts (AuthContext for authentication)
- `/src/hooks/` - Custom React hooks
- `/supabase/migrations/` - Database schema migrations

### Database Schema
The application uses three main tables:
- **students**: Student records with contact info, school details, and parent information
- **check_ins**: Timestamped check-in records linked to students
- **user_roles**: Role-based access control (admin, student, student_leader)

### User Roles
- Public users (for check-in kiosk)
- Students (can view own profile)
- Student Leaders (elevated student permissions)
- Administrators (full access)

### Key Routes
- `/` - Public check-in interface
- `/auth` - Authentication page
- `/admin` - Admin dashboard
- `/admin/analytics` - Analytics dashboard
- `/admin/import` - CSV import for bulk student data
- `/student` - Student profile view

## Development Patterns

### Component Structure
Components follow the shadcn/ui pattern - imported from `@/components/ui/`. These are built on Radix UI primitives with Tailwind styling.

### Data Fetching
Uses TanStack Query for all data operations. Supabase queries are wrapped in React Query hooks for caching and real-time updates.

### Form Handling
Forms use React Hook Form with Zod schemas for validation. Look for existing form patterns before creating new ones.

### Authentication
Authentication is handled through Supabase Auth, wrapped in AuthContext. Check user roles before allowing access to protected routes.

## Important Notes

- **No Testing Framework**: Currently no tests are set up. Consider adding Vitest if testing is needed.
- **Supabase Integration**: The Supabase client configuration is auto-generated. Don't modify files in `/src/integrations/supabase/` directly.
- **Real-time Updates**: The app uses Supabase real-time subscriptions for live check-in updates.
- **CSV Import**: Bulk student import is available at `/admin/import` with specific CSV format requirements.