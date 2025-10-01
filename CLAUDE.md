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
- `/sql-fixes/` - Production SQL patches (apply in order)

### Database Schema
The application uses these main tables:
- **students**: Student records with contact info, school details, parent information, and profile_pin for profile access
- **check_ins**: Timestamped check-in records linked to students (idempotent - one per student per day)
- **user_roles**: Role-based access control (admin, student, student_leader)
- **student_stats**: Gamification stats (points, rank, check-in count)
- **achievements**: Achievement definitions and tracking
- **student_achievements**: Junction table linking students to earned achievements

### Key Database Functions
- **search_student_for_checkin(search_term)** - Flexible search by phone/name/email with fuzzy matching
- **checkin_student(p_student_id)** - Idempotent check-in with PIN generation
- **verify_profile_pin(p_student_id, p_pin)** - PIN verification for profile access
- **generate_profile_pin()** - Generate random 4-digit PIN
- **process_checkin_rewards(p_student_id, p_checkin_id)** - Calculate and award gamification rewards
- **get_or_create_student_stats(p_student_id)** - Initialize stats record if not exists

### User Roles
- Public users (for check-in kiosk)
- Students (can view own profile)
- Student Leaders (elevated student permissions)
- Administrators (full access)

### Key Routes
- `/` - Public check-in interface (JRPG-themed)
- `/auth` - Authentication page
- `/admin` - Admin dashboard
- `/admin/analytics` - Analytics dashboard
- `/admin/import` - CSV import for bulk student data
- `/student` - Student profile view (PIN-protected)
- `/student/:id` - Public profile view (requires 4-digit PIN)

## Development Patterns

### Component Structure
Components follow the shadcn/ui pattern - imported from `@/components/ui/`. These are built on Radix UI primitives with Tailwind styling.

### Key Components
- **CheckInForm.tsx** - Main check-in interface with search, confirmation, and multi-result selection
- **GameCheckInSuccessDB.tsx** - Post-check-in reward display with PIN visibility
- **NewStudentForm.tsx** - Student registration form for first-time visitors
- **PublicStudentProfile.tsx** - PIN-protected profile view showing achievements and stats
- **Index.tsx** - Landing page with JRPG theme and rotating Bible verses
- **jrpg.css** - JRPG theme styles (buttons, textboxes, animations, backgrounds)

### Data Fetching
Uses TanStack Query for all data operations. Supabase queries are wrapped in React Query hooks for caching and real-time updates.

### Form Handling
Forms use React Hook Form with Zod schemas for validation. Look for existing form patterns before creating new ones.

### Authentication
Authentication is handled through Supabase Auth, wrapped in AuthContext. Check user roles before allowing access to protected routes.

## Key Features

### Gamification System
- **Points & Ranks**: Students earn points for check-ins and achievements
- **Achievements**: Multi-tier achievements (Bronze, Silver, Gold, Platinum) with retroactive awarding
- **Persistent Stats**: Check-in streaks, total attendance, and rank progression tracked in student_stats table
- **Real-time Rewards**: Immediate feedback on check-in with animated reward display

### Security & Privacy
- **PIN Protection**: 4-digit PINs protect student profile access (generated on first check-in)
- **RLS Policies**: Supabase Row Level Security prevents unauthorized data access
- **Check-in Privacy**: Check-ins table locked down - only readable by authenticated admins
- **Secure Functions**: Database functions use SECURITY DEFINER with proper validation

### Check-in Flow
1. Student searches by phone number OR name (flexible formatting)
2. Multiple matches show selection screen
3. Student confirms identity
4. Idempotent check-in (only one per day per student)
5. Gamification rewards calculated and displayed
6. Profile PIN shown (for first-time or returning students)

### JRPG Theme
- **Visual Style**: Bright fantasy theme with forest green, sky blue, and beige parchment
- **Typography**: Press Start 2P pixel font for retro gaming feel
- **UI Elements**: Pixelated borders, floating animations, animated starfield background
- **Bible Verses**: Rotating scripture verses that change between check-ins (not on timer)

## Production Deployment

### SQL Patches to Apply (in order)
The `/sql-fixes/` directory contains patches that must be applied to production:

1. **profile-functions.sql** - Core profile functions
2. **FINAL-fix-game-profile.sql** - Gamification profile fixes
3. **fix-get-or-create-stats.sql** - Student stats initialization
4. **fix-process-checkin-rewards.sql** - Reward calculation logic
5. **award-first-checkin-retroactively.sql** - Retroactive achievement awards
6. **lock-down-checkins.sql** - Security: Remove public read access to check_ins
7. **add-profile-pin.sql** - Add PIN protection system
8. **fix-idempotent-simple.sql** - Make check-ins idempotent (one per day)

These patches fix gamification, add security, and ensure data integrity.

## Important Notes

- **No Testing Framework**: Currently no tests are set up. Consider adding Vitest if testing is needed.
- **Supabase Integration**: The Supabase client configuration is auto-generated. Don't modify files in `/src/integrations/supabase/` directly.
- **Real-time Updates**: The app uses Supabase real-time subscriptions for live check-in updates.
- **CSV Import**: Bulk student import is available at `/admin/import` with specific CSV format requirements.
- **Phone Search**: Search handles various formats (dashes, dots, spaces, parentheses, country codes) automatically.
- **Idempotent Check-ins**: Students can only check in once per day - subsequent attempts return existing check-in with PIN.