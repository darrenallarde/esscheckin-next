# Getting Started

Developer onboarding guide for Sheepdoggo.

## Prerequisites

- Node.js 18+
- npm (comes with Node)
- Git
- A code editor (VS Code recommended)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/darrenallarde/esscheckin-next.git
cd esscheckin-next
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Create `.env.local` in the project root:

```bash
# Supabase (staging)
NEXT_PUBLIC_SUPABASE_URL=https://vilpdnwkfsmvqsiktqdf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<get-from-team>

# AI Recommendations
ANTHROPIC_API_KEY=<get-from-team>

# SMS (optional for local dev)
TWILIO_ACCOUNT_SID=<get-from-team>
TWILIO_AUTH_TOKEN=<get-from-team>
TWILIO_PHONE_NUMBER=<get-from-team>

# Email (optional for local dev)
RESEND_API_KEY=<get-from-team>
```

> **Note**: Local development uses the **staging** Supabase instance. Never use production credentials locally.

### 4. Run the Dev Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                      # Next.js App Router
│   ├── (public)/             # Public routes (no auth)
│   │   ├── auth/             # Login, signup, callback
│   │   ├── setup/            # First-time org setup
│   │   └── page.tsx          # Check-in kiosk (/)
│   ├── (protected)/          # Authenticated routes
│   │   └── [org]/            # Dynamic org slug
│   │       ├── dashboard/    # Main dashboard
│   │       ├── attendance/   # Attendance views
│   │       ├── people/       # Student directory
│   │       ├── groups/       # Group management
│   │       ├── analytics/    # Charts & reports
│   │       ├── curriculum/   # Teaching content
│   │       └── settings/     # Team & org settings
│   └── api/                  # API routes
│       ├── recommendations/  # AI generation
│       └── sms/              # Twilio webhooks
├── components/
│   ├── analytics/            # StatCard, charts
│   ├── checkin/              # JRPG check-in flow
│   ├── dashboard/            # Dashboard widgets
│   ├── groups/               # Group cards, modals
│   ├── layout/               # AppSidebar, navigation
│   ├── pastoral/             # BelongingSpectrum, AI display
│   ├── people/               # Profile modals
│   ├── sms/                  # Conversation threads
│   └── ui/                   # shadcn/ui components
├── hooks/
│   └── queries/              # TanStack Query hooks
├── lib/
│   └── supabase/             # Supabase client setup
├── types/                    # TypeScript definitions
└── utils/                    # Helper functions
```

## Key Files to Read First

| File | What It Does |
|------|--------------|
| `src/app/(public)/page.tsx` | Public check-in kiosk |
| `src/app/(protected)/[org]/dashboard/page.tsx` | Main dashboard |
| `src/components/pastoral/BelongingSpectrum.tsx` | Engagement visualization |
| `src/hooks/queries/use-students.ts` | Student data fetching |
| `src/lib/supabase/client.ts` | Browser Supabase client |
| `src/lib/supabase/server.ts` | Server Supabase client |

## Common Development Tasks

### Adding a New Page

1. Create file in `src/app/(protected)/[org]/your-page/page.tsx`
2. The `[org]` segment is the organization slug
3. Use `params.org` to get the current org

```tsx
export default async function YourPage({
  params
}: {
  params: { org: string }
}) {
  // params.org = organization slug
  return <div>Your content</div>
}
```

### Adding a New Query Hook

1. Create file in `src/hooks/queries/use-your-data.ts`
2. Follow the TanStack Query pattern:

```tsx
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export function useYourData(id: string | null) {
  return useQuery({
    queryKey: ["your-data", id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("your_table")
        .select("*")
        .eq("id", id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}
```

### Adding a UI Component

This project uses shadcn/ui. To add a new component:

```bash
npx shadcn@latest add button  # Example: add button component
```

Components are installed to `src/components/ui/`.

### Making Database Changes

**Always follow this workflow:**

1. Write your migration SQL
2. Apply to **staging** first:
   - Use Supabase MCP: `mcp__supabase__apply_migration` with `project_id: vilpdnwkfsmvqsiktqdf`
3. Test locally at `localhost:3000`
4. Apply to **production**:
   - Use Supabase MCP: `mcp__supabase__apply_migration` with `project_id: hhjvsvezinrbxeropeyl`

> **Critical**: Never skip staging. Local dev uses the staging database.

## Environment Reference

| Environment | Supabase Project ID | Purpose |
|-------------|---------------------|---------|
| **Staging** | `vilpdnwkfsmvqsiktqdf` | Local dev, testing |
| **Production** | `hhjvsvezinrbxeropeyl` | Vercel deployment |

## Useful Commands

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run lint      # Run ESLint
npm run start     # Run production build locally
```

## Debugging

### Check Supabase Logs
- Staging: https://supabase.com/dashboard/project/vilpdnwkfsmvqsiktqdf/logs
- Production: https://supabase.com/dashboard/project/hhjvsvezinrbxeropeyl/logs

### Common Issues

**"Invalid API key"**
- Check `.env.local` has correct `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Restart dev server after changing env vars

**"RLS policy violation"**
- You're likely not authenticated or missing org membership
- Check browser console for auth state
- Verify user exists in `organization_members` table

**"Column does not exist"**
- Migration wasn't applied to staging
- Run the migration against `vilpdnwkfsmvqsiktqdf`

## Next Steps

- Read [Architecture](./architecture.md) to understand the system design
- Check [Database](./database.md) for schema reference
- Browse the [Feature Docs](./features/) to understand each feature
