# 🎯 CTO Handoff - ESS Check-in System

Welcome! This document provides a quick overview of the system and where to find detailed information.

## 🚀 Quick Start

**Run locally:**
```bash
npm install
npm run dev
# Visit http://localhost:5173
```

**Build for production:**
```bash
npm run build
# Outputs to dist/ folder
```

---

## 📚 Documentation

The codebase is fully documented. Start here:

### 1. **CLAUDE.md** - Architecture Overview
Read this first! Covers:
- Tech stack (React + TypeScript + Vite + Supabase)
- Project structure and key directories
- Main features (check-in, gamification, pastoral dashboard, AI recommendations)
- Component structure and naming conventions
- Development patterns

### 2. **DATABASE.md** - Database Schema
Complete database documentation:
- All tables with column descriptions
- Key database functions (check-in, search, gamification, pastoral analytics)
- Design decisions and trade-offs
- Common queries
- Performance considerations

### 3. **DEPLOYMENT.md** - Setup Guide
Step-by-step deployment instructions:
- Prerequisites and environment setup
- Database migration and SQL patches
- Creating admin users
- Frontend deployment (Vercel, Netlify, or other)
- Optional Edge Functions setup
- Troubleshooting guide

### 4. **sql-fixes/README.md** - SQL Patches
Production database patches:
- Core patches (run once, in order)
- Recent feature additions
- Utilities for diagnostics
- What's in the archive folder

---

## 🏗️ System Architecture

### Tech Stack
- **Frontend:** React 18 + TypeScript + Vite
- **UI Components:** shadcn/ui (Radix UI + Tailwind CSS)
- **State Management:** TanStack Query (React Query)
- **Backend:** Supabase (PostgreSQL + Auth + Real-time + Edge Functions)
- **AI:** Claude AI (Anthropic) for pastoral recommendations
- **Routing:** React Router DOM

### Key Features

#### 1. Check-in System
Public kiosk interface for student check-ins with:
- Flexible search (phone, name, email)
- Idempotent check-ins (one per day max)
- Automatic PIN generation for profile access
- JRPG-themed UI (pixel art, retro game aesthetic)

#### 2. Gamification
- Points and ranks (Newcomer → Adventurer → Warrior → Champion → Legend)
- Multi-tier achievements (Bronze, Silver, Gold, Platinum)
- Streak tracking (consecutive weeks)
- Real-time reward display on check-in

#### 3. Pastoral Dashboard
Engagement tracking tool with:
- **Belonging Status Categories:**
  - Ultra-Core: 5+ check-ins in last 4 weeks
  - Core: 4+ check-ins in 8 weeks
  - Connected: 2-3 check-ins in 8 weeks
  - On the Fringe: Not seen 30-60 days (at-risk)
  - Missing: Not seen 60+ days (urgent)
- Visual attendance patterns (8 weekly boxes)
- Automated action recommendations
- Priority-based sorting

#### 4. AI Recommendations
Claude AI integration for personalized pastoral insights:
- Analyzes attendance, grade, gender, belonging status
- Considers current teaching curriculum
- Generates specific action items (not generic advice)
- Can be automated via Edge Function or triggered manually

#### 5. Analytics Dashboard
- Daily unique student attendance graphs
- Detailed check-in breakdowns
- Historical trend analysis

#### 6. CSV Import Tools
- Bulk student import
- Historical check-in import (for data migration)

---

## 📂 Project Structure

```
esscheckin/
├── src/
│   ├── components/          # React components
│   │   ├── pastoral/       # Pastoral dashboard components
│   │   ├── curriculum/     # Curriculum management components
│   │   └── ui/             # shadcn/ui base components
│   ├── pages/              # Route-based pages
│   ├── types/              # TypeScript interfaces
│   ├── utils/              # Utility functions (AI, gamification)
│   ├── contexts/           # React contexts (AuthContext)
│   └── hooks/              # Custom React hooks
├── supabase/
│   ├── migrations/         # Database schema migrations
│   └── functions/          # Edge Functions (serverless)
├── sql-fixes/              # Production SQL patches
│   ├── README.md          # Patch documentation
│   └── archive/           # Obsolete files (for reference)
└── docs (these files):
    ├── CLAUDE.md          # Architecture guide
    ├── DATABASE.md        # Database documentation
    ├── DEPLOYMENT.md      # Setup instructions
    └── HANDOFF.md         # This file
```

---

## 🔑 Key Files to Review

### Core Check-in Flow
- `/src/components/CheckInForm.tsx` - Main check-in interface with state machine pattern
- `/src/components/GameCheckInSuccessDB.tsx` - Post-check-in rewards display
- `/src/components/NewStudentForm.tsx` - New student registration

### Pastoral Dashboard
- `/src/pages/PastoralDashboard.tsx` - Main dashboard with filters and search
- `/src/components/pastoral/StudentPastoralCard.tsx` - Individual student cards with attendance patterns
- `/src/components/pastoral/BelongingSpectrum.tsx` - Visual distribution chart

### Database Functions
- `/sql-fixes/update-ultra-core-threshold.sql` - **MOST IMPORTANT** - Calculates all pastoral analytics

### AI System
- `/src/utils/aiRecommendations.ts` - Client-side AI generation
- `/supabase/functions/generate-weekly-recommendations/` - Automated Edge Function

---

## 🗄️ Database Highlights

### Key Tables
- `students` - Student records
- `check_ins` - Check-in events (idempotent, one per day)
- `student_stats` - Gamification points/ranks/streaks
- `achievements` & `student_achievements` - Achievement system
- `curriculum_weeks` - Teaching curriculum for AI context
- `ai_recommendations` - Generated pastoral recommendations with history

### Key Functions
- `get_pastoral_analytics()` - Returns all student engagement data
- `checkin_student(student_id)` - Idempotent check-in with PIN generation
- `search_student_for_checkin(search_term)` - Flexible fuzzy search
- `process_checkin_rewards(student_id, checkin_id)` - Calculate gamification rewards

**See DATABASE.md for complete schema documentation**

---

## 🔐 Security Notes

- **Row Level Security (RLS)** enabled on all tables
- **check_ins table is locked down** - no public read access (privacy)
- **Functions use SECURITY DEFINER** only when necessary
- **PINs protect student profiles** - 4-digit PINs generated on first check-in
- **Admin role required** for dashboard access
- **Environment variables** should never be committed (already in .gitignore)

---

## 📊 Code Quality

### Recent Audit (Completed)
✅ Cleaned up SQL directory (archived 26 obsolete files)
✅ Updated CLAUDE.md with current architecture
✅ Added inline comments to key components
✅ Created comprehensive DATABASE.md
✅ Archived unused React components
✅ Verified production build works

### Code Style
- **TypeScript strict mode** enabled
- **ESLint** configured (run `npm run lint`)
- **Functional components** with hooks (no class components)
- **Discriminated unions** for type-safe state machines (see CheckInForm.tsx ViewState)
- **shadcn/ui patterns** for consistent component usage

---

## 🧪 Testing

**Current state:** No automated test framework set up

**Manual testing checklist:**
- [ ] Check-in flow (search → confirm → rewards → PIN display)
- [ ] New student registration
- [ ] Idempotent check-ins (try checking in same student twice)
- [ ] Admin dashboard loads
- [ ] Analytics graphs display
- [ ] Pastoral dashboard calculates belonging statuses correctly
- [ ] Curriculum management (add/edit/set current)
- [ ] AI recommendations generate
- [ ] CSV imports (students and check-ins)

**To add tests:** Consider Vitest + React Testing Library

---

## 🚨 Known Issues & Trade-offs

### Large Bundle Size
Build warns about 1.2MB main bundle. Could be improved with:
- Dynamic imports for admin routes
- Code splitting by feature
- Not critical for current scale, but consider if app grows significantly

### No Offline Mode
App requires internet connection. Supabase calls fail gracefully with error messages.

### AI Recommendations Not Real-time
- Generated on-demand or via scheduled Edge Function
- Not instantly updated when student checks in
- This is by design (recommendations consider broader patterns, not single events)

### Attendance Pattern Shows 8 Weeks
- Excludes current incomplete week
- This is intentional (prevents misleading partial data)
- If you want 9 weeks, modify `update-ultra-core-threshold.sql`

---

## 💡 Future Enhancements (Ideas)

These are NOT implemented, just ideas for future:

### Short-term (Low effort)
- Add dark mode (Tailwind + context)
- Export pastoral dashboard to CSV
- Print-friendly view for student profiles
- Email notifications for at-risk students

### Medium-term (Moderate effort)
- Automated SMS outreach via Twilio integration
- Parent portal (let parents see check-in history)
- Small group assignment and tracking
- Event check-in (not just weekly youth group)

### Long-term (Significant effort)
- Mobile app (React Native + Supabase)
- Multi-campus support (separate locations)
- Advanced analytics (cohort analysis, retention funnel)
- Integration with ChMS (Planning Center, CCB, etc.)

---

## 🆘 Getting Help

### Common Issues

**Build fails:**
- Check Node.js version (need 18+)
- Delete `node_modules` and run `npm install` again
- Clear npm cache: `npm cache clean --force`

**Database errors:**
- Verify `.env.local` has correct Supabase URL and key
- Check RLS policies in Supabase dashboard
- Review `/sql-fixes/README.md` for patch order

**AI recommendations not working:**
- Verify `VITE_ANTHROPIC_API_KEY` is set
- Check current curriculum week is set (`is_current = true`)
- Look at browser console for API errors

### Where to Look

| Issue Type | Where to Check |
|------------|---------------|
| Database schema | `DATABASE.md` + `/supabase/migrations/` |
| SQL functions | `/sql-fixes/` directory + `DATABASE.md` |
| Component behavior | Inline comments in component files |
| Environment setup | `DEPLOYMENT.md` |
| Architecture questions | `CLAUDE.md` |
| Deployment issues | `DEPLOYMENT.md` troubleshooting section |

---

## 📝 Development Workflow

### Making Changes

1. **Create feature branch:**
   ```bash
   git checkout -b feature/my-new-feature
   ```

2. **Make changes and test:**
   ```bash
   npm run dev
   # Test your changes locally
   ```

3. **Run linter:**
   ```bash
   npm run lint
   ```

4. **Build to verify:**
   ```bash
   npm run build
   ```

5. **Commit and push:**
   ```bash
   git add .
   git commit -m "Add feature: description"
   git push origin feature/my-new-feature
   ```

### Database Changes

**For schema changes:**
1. Create migration via Supabase CLI: `supabase migration new my_change`
2. Test locally: `supabase db reset`
3. Apply to production: `supabase db push`

**For function changes:**
1. Create SQL file in `/sql-fixes/`
2. Add to `/sql-fixes/README.md`
3. Test on staging first
4. Apply to production via SQL Editor

---

## ✅ System Status

As of this handoff:

✅ **Production Ready** - All core features working
✅ **Documented** - Comprehensive docs in place
✅ **Code Clean** - Obsolete files archived
✅ **Build Passing** - No errors, only bundle size warning
✅ **Database Optimized** - Latest pastoral analytics function deployed
✅ **Security Audited** - RLS policies in place, check-ins locked down

### Recent Changes (Last Session)
- Redefined Ultra-Core threshold (5+ in 4 weeks, from 12+ in 8 weeks)
- Fixed attendance pattern cartesian product bug (was showing 30+ boxes)
- Simplified analytics dashboard (removed redundant Total Check-ins graph)
- Enhanced AI recommendations with detailed grade/gender guidance
- Cleaned up 26 obsolete SQL files
- Added comprehensive documentation (CLAUDE.md, DATABASE.md, DEPLOYMENT.md)

---

## 🎓 Learning the Codebase

**Recommended order for new developers:**

1. Read `CLAUDE.md` (30 min) - Get architecture overview
2. Run `npm run dev` (5 min) - See the app in action
3. Read `DATABASE.md` - Database schema section (20 min)
4. Review `/src/components/CheckInForm.tsx` (15 min) - See state machine pattern
5. Review `/src/pages/PastoralDashboard.tsx` (15 min) - See data fetching pattern
6. Read `/sql-fixes/update-ultra-core-threshold.sql` (20 min) - Understand pastoral analytics
7. Review `DEPLOYMENT.md` (10 min) - Know how to deploy

**Total time: ~2 hours to understand the full system**

---

## 📞 Questions?

If you have questions:
1. Check the relevant .md file first (likely has the answer)
2. Search the codebase for examples (grep or global search in IDE)
3. Review inline comments in the specific file
4. Check Supabase dashboard for database-related questions

---

## 🙏 Final Notes

### Design Philosophy
- **Simplicity first** - Avoid over-engineering
- **Data-driven** - Pastoral decisions based on real attendance patterns
- **Privacy-conscious** - Check-ins are protected, PINs for profile access
- **Maintainable** - Clear naming, documented functions, TypeScript for safety

### What Makes This System Unique
- **Belonging Status framework** - Not just "attended" or "didn't attend", but nuanced engagement levels
- **Idempotent by design** - Database constraints prevent data issues
- **AI-powered pastoral care** - Context-aware recommendations linked to teaching
- **Gamification without manipulation** - Fun rewards, but not exploitative
- **Weekly attendance patterns** - Visual at-a-glance understanding of consistency

---

**🚀 You're all set!** The system is clean, documented, and ready for continued development. Good luck!
