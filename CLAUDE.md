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
  - `/src/components/pastoral/` - Pastoral dashboard components
  - `/src/components/ui/` - shadcn/ui base components
- `/src/pages/` - Route-based page components
- `/src/integrations/supabase/` - Supabase client and types (auto-generated)
- `/src/contexts/` - React contexts (AuthContext for authentication)
- `/src/hooks/` - Custom React hooks
- `/src/utils/` - Utility functions (including AI recommendation generation)
- `/supabase/migrations/` - Database schema migrations
- `/supabase/functions/` - Supabase Edge Functions (serverless functions)
- `/sql-fixes/` - Production SQL patches (see README in that folder)

### Database Schema
The application uses these main tables:

**Core Tables:**
- **students**: Student records with contact info, school details, parent information, and profile_pin for profile access
- **check_ins**: Timestamped check-in records linked to students (idempotent - one per student per day)
- **user_roles**: Role-based access control (admin, student, student_leader)

**Gamification:**
- **student_stats**: Gamification stats (points, rank, check-in count)
- **achievements**: Achievement definitions and tracking
- **student_achievements**: Junction table linking students to earned achievements

**Pastoral Care:**
- **curriculum_weeks**: Weekly teaching curriculum with topics, scripture, and key principles
- **ai_recommendations**: AI-generated pastoral recommendations for each student (linked to curriculum)
- **student_profiles_extended**: Extended student profiles with interests, prayer requests, etc.

### Key Database Functions

**Check-in Functions:**
- **search_student_for_checkin(search_term)** - Flexible search by phone/name/email with fuzzy matching
- **checkin_student(p_student_id)** - Idempotent check-in with PIN generation
- **import_historical_checkin(p_phone, p_checked_in_at, p_found_name)** - Import historical check-ins from CSV

**Profile & Security:**
- **verify_profile_pin(p_student_id, p_pin)** - PIN verification for profile access
- **generate_profile_pin()** - Generate random 4-digit PIN

**Gamification:**
- **process_checkin_rewards(p_student_id, p_checkin_id)** - Calculate and award gamification rewards
- **get_or_create_student_stats(p_student_id)** - Initialize stats record if not exists

**Pastoral Analytics:**
- **get_pastoral_analytics()** - Returns comprehensive pastoral data for all students including:
  - Belonging status (Ultra-Core, Core, Connected, On the Fringe, Missing)
  - Attendance patterns for last 8 weeks (weekly aggregation)
  - Check-in counts (8 weeks, last 4 weeks)
  - Days since last seen
  - Recommended pastoral actions with message templates
  - Priority scoring for urgent follow-up

### User Roles
- Public users (for check-in kiosk)
- Students (can view own profile)
- Student Leaders (elevated student permissions)
- Administrators (full access)

### Key Routes

**Public Routes:**
- `/` - Public check-in interface (JRPG-themed)
- `/auth` - Authentication page
- `/student` - Student profile view (PIN-protected)
- `/student/:id` - Public profile view (requires 4-digit PIN)

**Admin Routes (Authenticated):**
- `/admin` - Admin dashboard overview
- `/admin/analytics` - Check-in analytics dashboard with graphs and breakdowns
- `/admin/pastoral` - Pastoral dashboard with belonging status and AI recommendations
- `/admin/curriculum` - Curriculum management (weekly topics, scripture, teaching)
- `/admin/import` - CSV import for bulk student data
- `/admin/import-checkins` - Historical check-in import tool

## Development Patterns

### Component Structure
Components follow the shadcn/ui pattern - imported from `@/components/ui/`. These are built on Radix UI primitives with Tailwind styling.

### Key Components

**Check-in Flow:**
- **CheckInForm.tsx** (`/src/components/CheckInForm.tsx`) - Main check-in interface with search, confirmation, and multi-result selection
- **GameCheckInSuccessDB.tsx** (`/src/components/GameCheckInSuccessDB.tsx`) - Post-check-in reward display with PIN visibility
- **NewStudentForm.tsx** (`/src/components/NewStudentForm.tsx`) - Student registration form for first-time visitors

**Pastoral Dashboard:**
- **StudentPastoralCard.tsx** (`/src/components/pastoral/StudentPastoralCard.tsx`) - Individual student card showing:
  - Belonging status badge (Ultra-Core, Core, Connected, On the Fringe, Missing)
  - Last 8 weeks attendance pattern (weekly boxes: grey+X = no attendance, green+white check = attended)
  - Recommended pastoral action with copyable message template
  - AI-generated recommendation (if available)
- **BelongingSpectrum.tsx** (`/src/components/pastoral/BelongingSpectrum.tsx`) - Visual distribution of students across belonging statuses
- **RecommendationDisplay.tsx** (`/src/components/pastoral/RecommendationDisplay.tsx`) - AI recommendation card with key insight and action bullets

**Student Profile:**
- **PublicStudentProfile.tsx** (`/src/pages/PublicStudentProfile.tsx`) - PIN-protected profile view showing achievements and stats

**Landing Page:**
- **Index.tsx** (`/src/pages/Index.tsx`) - Landing page with JRPG theme and rotating Bible verses
- **jrpg.css** (`/src/index.css`) - JRPG theme styles (buttons, textboxes, animations, backgrounds)

### Data Fetching
Uses TanStack Query for all data operations. Supabase queries are wrapped in React Query hooks for caching and real-time updates.

### Form Handling
Forms use React Hook Form with Zod schemas for validation. Look for existing form patterns before creating new ones.

### Authentication
Authentication is handled through Supabase Auth, wrapped in AuthContext. Check user roles before allowing access to protected routes.

## Key Features

### 1. Check-in System
**Public-facing kiosk interface for student check-ins:**
1. Student searches by phone number OR name (flexible formatting)
2. Multiple matches show selection screen
3. Student confirms identity
4. Idempotent check-in (only one per day per student)
5. Gamification rewards calculated and displayed
6. Profile PIN shown (for first-time or returning students)

**Technical details:**
- Search handles various phone formats (dashes, dots, spaces, parentheses, country codes)
- Fuzzy name matching using PostgreSQL trigram similarity
- Real-time duplicate prevention via database constraint

### 2. Gamification System
- **Points & Ranks**: Students earn points for check-ins and achievements
- **Achievements**: Multi-tier achievements (Bronze, Silver, Gold, Platinum) with retroactive awarding
- **Persistent Stats**: Check-in streaks, total attendance, and rank progression tracked in student_stats table
- **Real-time Rewards**: Immediate feedback on check-in with animated reward display

### 3. Pastoral Dashboard
**Comprehensive tool for tracking student engagement and providing pastoral care:**

**Belonging Status Categories:**
- **Ultra-Core**: 5+ check-ins in last 4 weeks (highly engaged)
- **Core**: 4+ check-ins in 8 weeks (~1x/week, consistent)
- **Connected**: 2-3 check-ins in 8 weeks (periodic attendance)
- **On the Fringe**: Not seen in 30-60 days (at-risk)
- **Missing**: Not seen in 60+ days (urgent follow-up needed)

**Features:**
- Visual attendance patterns (8 weekly boxes showing attendance intensity)
- Automated pastoral action recommendations (e.g., "REACH OUT NOW", "DEVELOP", "AFFIRM")
- Pre-written message templates (copyable for quick outreach)
- AI-powered recommendations contextual to current teaching curriculum
- Priority scoring for urgent follow-up (Missing and On the Fringe students prioritized)

### 4. AI Recommendations System
**Claude AI integration for personalized pastoral insights:**

**How it works:**
1. Admin sets current curriculum week (topic, scripture, key principles)
2. AI analyzes each student's attendance pattern, belonging status, and developmental phase
3. Generates specific recommendations:
   - Key insight (120 chars) - one specific observation about THIS student
   - 3 action bullets (80 chars each) - concrete next steps
   - Context paragraph - explains WHY these actions matter

**AI considers:**
- Grade level and developmental phase (middle school vs high school)
- Gender-specific ministry approaches (if available)
- Attendance trends (declining, stable, improving)
- Current teaching topic and application challenge
- Days since last seen and overall engagement pattern

**Implementation:**
- Client-side generation (`/src/utils/aiRecommendations.ts`)
- Automated Edge Function (`/supabase/functions/generate-weekly-recommendations/`)
- Can be scheduled (e.g., Thursday 6am, Monday 6am) or triggered manually
- History tracked in `ai_recommendations` table

### 5. Analytics Dashboard
**Track check-in trends and attendance patterns:**
- Daily unique student attendance graphs (last 90 days)
- Detailed breakdown tables showing who checked in on specific dates
- Historical trend analysis

### 6. CSV Import Tools
**Bulk data import for setup and historical data:**
- Student bulk import (phone, name, email, grade, school, parent info)
- Historical check-in import (phone + timestamp + optional name)
- Duplicate detection and smart matching

### 7. Security & Privacy
- **PIN Protection**: 4-digit PINs protect student profile access (generated on first check-in)
- **RLS Policies**: Supabase Row Level Security prevents unauthorized data access
- **Check-in Privacy**: Check-ins table locked down - only readable by authenticated admins
- **Secure Functions**: Database functions use SECURITY DEFINER with proper validation

### 8. JRPG Theme (Public Check-in Interface)
- **Visual Style**: Bright fantasy theme with forest green, sky blue, and beige parchment
- **Typography**: Press Start 2P pixel font for retro gaming feel
- **UI Elements**: Pixelated borders, floating animations, animated starfield background
- **Bible Verses**: Rotating scripture verses that change between check-ins (not on timer)

## Production Deployment

### Prerequisites
- Node.js 18+ and npm
- Supabase account with project created
- Anthropic API key (for AI recommendations feature)

### Environment Setup
Create a `.env.local` file with:
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_ANTHROPIC_API_KEY=your_anthropic_key  # Optional, for AI recommendations
```

### Initial Database Setup
1. Run migrations in `/supabase/migrations/` in order (Supabase CLI handles this)
2. Apply SQL patches from `/sql-fixes/` - see `/sql-fixes/README.md` for detailed instructions

**Core patches (run once, in order):**
1. `profile-functions.sql` - Core profile functions
2. `FINAL-fix-game-profile.sql` - Gamification profile fixes
3. `fix-get-or-create-stats.sql` - Student stats initialization (critical!)
4. `fix-process-checkin-rewards.sql` - Reward calculation logic
5. `award-first-checkin-retroactively.sql` - Retroactive achievement awards
6. `lock-down-checkins.sql` - Security: Remove public read access to check_ins
7. `add-profile-pin.sql` - Add PIN protection system
8. `fix-idempotent-simple.sql` - Make check-ins idempotent (one per day)

**Recent feature additions (apply after core):**
- `create-pastoral-analytics-function.sql` - Pastoral dashboard analytics
- `update-ultra-core-threshold.sql` - **LATEST** - Updated thresholds and attendance patterns
- `setup-automated-recommendations.sql` - AI recommendations system
- `add-checkin-import-function.sql` - Historical check-in import

### Frontend Deployment
```bash
npm install
npm run build
# Deploy dist/ folder to your hosting provider (Vercel, Netlify, etc.)
```

### Supabase Edge Functions (Optional - for automated AI recommendations)
```bash
# Deploy the weekly recommendations function
supabase functions deploy generate-weekly-recommendations

# Set environment variables
supabase secrets set ANTHROPIC_API_KEY=your_key
supabase secrets set CRON_SECRET=your_secret

# Schedule it (e.g., Thursday 6am, Monday 6am)
# Configure via Supabase dashboard or cron trigger
```

## Important Notes & Best Practices

### Code Guidelines
- **Simplicity First**: Keep code simple and readable. Avoid over-engineering.
- **TypeScript Interfaces**: Use types from `/src/types/` for pastoral, curriculum, and student data
- **Supabase Client**: Auto-generated in `/src/integrations/supabase/` - don't modify directly
- **shadcn/ui Components**: Import from `@/components/ui/` - built on Radix UI primitives
- **React Query**: All data fetching uses TanStack Query for caching and real-time updates

### Database Best Practices
- **Idempotent Functions**: Most database functions are safe to call multiple times
- **SECURITY DEFINER**: All functions use SECURITY DEFINER with proper validation
- **RLS Policies**: Row Level Security enforced on all tables
- **Check-in Constraint**: Unique constraint on (student_id, DATE(checked_in_at)) prevents duplicates

### Known Behaviors
- **Idempotent Check-ins**: Students can only check in once per day - subsequent attempts return existing check-in with PIN
- **Phone Search**: Search handles various formats (dashes, dots, spaces, parentheses, country codes) automatically
- **Attendance Patterns**: Shows 8 complete weeks (excludes current incomplete week)
- **AI Recommendations**: Generated client-side or via Edge Function, stored with history tracking
- **CSV Import**: Bulk student import available at `/admin/import` with specific CSV format requirements

### Troubleshooting

**Problem: Function signature change errors**
```
ERROR: 42P13: cannot change return type of existing function
```
**Solution:** Drop the function first:
```sql
DROP FUNCTION IF EXISTS public.get_pastoral_analytics();
-- Then run the CREATE FUNCTION statement
```

**Problem: Duplicate check-ins in database**
**Solution:** Run `/sql-fixes/check-and-clean-duplicates.sql` to identify and clean them up

**Problem: Students not earning achievements**
**Solution:** Ensure these patches have been applied:
1. `fix-get-or-create-stats.sql`
2. `fix-process-checkin-rewards.sql`

**Problem: Pastoral dashboard showing wrong attendance counts**
**Solution:** Make sure `update-ultra-core-threshold.sql` has been applied (supersedes older versions)

**Problem: AI recommendations not generating**
**Solution:**
1. Check VITE_ANTHROPIC_API_KEY is set in environment
2. Verify current curriculum week is set (`is_current = true` in `curriculum_weeks` table)
3. Check browser console for API errors

### Testing
- **No Testing Framework**: Currently no tests are set up. Consider adding Vitest if testing is needed.
- **Manual Testing**: Test core flows before deploying:
  1. Check-in flow (search, select, confirm, rewards)
  2. Pastoral dashboard (belonging status, attendance patterns, AI recommendations)
  3. Analytics dashboard (graphs, breakdowns)
  4. CSV imports (students, check-ins)