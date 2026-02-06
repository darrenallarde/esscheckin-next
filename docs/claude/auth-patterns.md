# Auth Patterns

Reference for SheepDoggo's authentication system. Auth is ONLY on the devotional page (`/d/[id]`). Check-in kiosk has NO login.

## Auth Methods

| Method | Who Uses It | Synthetic Email Pattern | Key Files |
|--------|------------|------------------------|-----------|
| Phone OTP | Students (mobile) | `{digits}@phone.sheepdoggo.app` | `src/app/api/devotional/send-phone-otp/route.ts`, `src/app/api/devotional/verify-phone-otp/route.ts` |
| Email OTP | Leaders/adults with email | Real email (native Supabase) | `src/hooks/queries/use-devotional-auth.ts` |
| Username/Password | Students without phone | `{username}@{orgSlug}.sheepdoggo.app` | `src/app/api/devotional/signup/route.ts` |

## Phone OTP Flow

1. **User enters phone** → `POST /api/devotional/send-phone-otp`
2. **Rate check**: 1 code per 60s per phone (checks `phone_otp_codes` table)
3. **Generate code**: 6-digit random → store in `phone_otp_codes` with 10min expiry
4. **Send SMS**: Invoke `send-otp-sms` edge function
5. **User enters code** → `POST /api/devotional/verify-phone-otp`
6. **Verify**: Max 5 attempts, compare codes, mark verified
7. **Find/create auth user**: Synthetic email `{digits}@phone.sheepdoggo.app`
   - Try `admin.createUser({ email, phone, email_confirm: true, phone_confirm: true })`
   - If exists (duplicate), generate magic link anyway
8. **Generate magic link**: `admin.generateLink({ type: "magiclink", email })` → returns `token_hash`
9. **Client establishes session**: `supabase.auth.verifyOtp({ token_hash, type: "email" })`
10. **Link profile**: `supabase.rpc("link_phone_to_profile", { p_phone })` → sets `profiles.user_id`

**Source files:**
- `src/app/api/devotional/send-phone-otp/route.ts` — Rate limit + code generation + SMS send
- `src/app/api/devotional/verify-phone-otp/route.ts` — Code verification + auth user + magic link
- `src/hooks/queries/use-devotional-auth.ts` — `sendPhoneOtp()`, `verifyPhoneOtp()` client functions

## Email OTP Flow

1. **User enters email** → `supabase.auth.signInWithOtp({ email, shouldCreateUser: true })`
2. **Supabase sends magic link** natively
3. **User clicks link** → `/auth/callback?code={code}`
4. **Callback**: `exchangeCodeForSession(code)` → call `accept_pending_invitations` RPC → redirect
5. **Link profile**: `supabase.rpc("link_email_to_profile", { p_email })`

**Source files:**
- `src/hooks/queries/use-devotional-auth.ts` — `sendEmailOtp()`, `verifyEmailOtp()`
- `src/app/(public)/auth/callback/route.ts` — Code exchange + invitation acceptance + redirect

## Username/Password Flow

1. **User identifies**: `find_profile_for_signup` RPC (searches by phone OR email in org)
2. **Live validation**: `check_username_available` RPC (case-insensitive, org-scoped)
3. **Signup** → `POST /api/devotional/signup`
   - Validate: username `^[a-zA-Z0-9_]{3,20}$`, password min 6 chars
   - Check username available + profile exists + not already linked
   - Synthetic email: `{username.toLowerCase()}@{org_slug}.sheepdoggo.app`
   - `admin.createUser({ email, password, email_confirm: true })`
   - Link: `UPDATE profiles SET user_id = {userId} WHERE id = profile_id`
   - Store: `INSERT INTO student_auth_usernames (profile_id, organization_id, username)`
4. **Client signs in**: `supabase.auth.signInWithPassword({ email: syntheticEmail, password })`

**Cleanup on failure:** If profile link fails, deletes auth user via `admin.deleteUser(userId)`.

**Source files:**
- `src/app/api/devotional/signup/route.ts` — Validation + user creation + profile linking
- `src/hooks/queries/use-devotional-auth.ts` — `findProfileForSignup()`, `checkUsername()`, `signUpWithUsername()`

## Supabase Client Types

| Client | Created By | Used In | Auth Context |
|--------|-----------|---------|-------------|
| Browser | `src/lib/supabase/client.ts` | Client components, hooks | User's session (anon key + cookies) |
| Server | `src/lib/supabase/server.ts` | Server Components, API routes | User's session (reads cookies) |
| Middleware | Created inline in `src/middleware.ts` | Route protection | User's session (reads/writes cookies) |
| Service Role | Created in API routes with `SUPABASE_SERVICE_ROLE_KEY` | `send-phone-otp`, `verify-phone-otp`, `signup` | Bypasses RLS entirely |

**Gotcha:** Server client's `setAll()` fails silently in Server Components — expected, middleware handles token refresh.

## Middleware (`src/middleware.ts`)

**Route protection logic:**
- **Public paths** (no auth): `/auth`, `/setup`, `/api`, `/d/`, `/checkin/`
- **Protected paths** (auth required): `/{orgSlug}/home`, `/{orgSlug}/students`, etc.
- **Redirects:**
  - No auth + protected route → `/auth?next={pathname}`
  - Authenticated + `/auth` → `/setup`
  - Legacy paths (`/dashboard`, `/students`) → `/setup?redirect={pathname}`
  - `/{org}/dashboard` → `/{org}/home`

**Matcher config:**
```
/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)
```

## RLS Auth Helpers

All are `SECURITY DEFINER` + `SET search_path = public`. Used in RLS policies to avoid infinite recursion.

| Helper | Signature | Purpose |
|--------|-----------|---------|
| `auth_is_super_admin` | `(p_user_id UUID DEFAULT auth.uid()) → BOOLEAN` | Checks `user_roles` table for `super_admin` |
| `auth_user_org_ids` | `(p_user_id UUID DEFAULT auth.uid()) → SETOF UUID` | Returns org IDs from BOTH legacy + new tables |
| `auth_profile_org_ids` | `(p_user_id UUID DEFAULT auth.uid()) → UUID[]` | Returns org IDs from `organization_memberships` only |
| `auth_has_org_role` | `(p_org_id UUID, p_roles TEXT[], p_user_id UUID DEFAULT auth.uid()) → BOOLEAN` | Checks role in BOTH legacy + new tables |
| `auth_get_profile_id` | `(p_user_id UUID DEFAULT auth.uid()) → UUID` | Returns profile ID for user |

**Dual-table pattern:** During migration, `auth_user_org_ids` and `auth_has_org_role` check BOTH `organization_members` (legacy) AND `organization_memberships` (new).

## Profile Linking RPCs

| RPC | Input | Logic | Returns |
|-----|-------|-------|---------|
| `link_phone_to_profile` | `p_phone TEXT` | Normalize phone → find profile → set `user_id` | `{ success, profile_id, first_name, already_linked }` |
| `link_email_to_profile` | `p_email TEXT` | Normalize email → find profile → set `user_id` | `{ success, profile_id, first_name, already_linked }` |
| `find_profile_for_signup` | `p_org_id UUID, p_identifier TEXT` | Try as phone OR email in org | `{ found, already_linked, profile_id, first_name }` |
| `check_username_available` | `p_org_id UUID, p_username TEXT` | Case-insensitive check in `student_auth_usernames` | `BOOLEAN` |
| `accept_pending_invitations` | `p_user_id UUID, p_user_email TEXT` | Find + accept matching invitations | void |
| `get_user_organizations` | `p_user_id UUID` | Return orgs user belongs to | `TABLE (organization_slug, ...)` |

## Auth Callback (`src/app/(public)/auth/callback/route.ts`)

Handles OAuth and magic link redirects:
1. Exchange code for session: `exchangeCodeForSession(code)`
2. Accept pending invitations: `accept_pending_invitations` RPC
3. Check org membership: `get_user_organizations` RPC
4. Redirect: No orgs → `/setup`, has orgs → `/{firstOrg}/home` or `next` param

## Session Restore vs Fresh Login

**Different code paths — test both separately.** (Feb 5 bug: session restore didn't hydrate user name)

**Session restore** (`DevotionalAuthGate` component):
1. `auth.checkSession()` → get session
2. Query `profiles` table for `first_name` where `user_id = session.user.id`
3. Set authenticated + name

**Fresh login:**
1. Auth method completes → returns `{ profile_id, first_name }`
2. `handleAuthSuccess(profileId, name)` → set authenticated + name

**Key difference:** Fresh login gets name from RPC response. Session restore must explicitly query profiles table.

**Source:** `src/components/devotional/DevotionalAuthGate.tsx`

## Synthetic Email Patterns

```
Username/Password: {username.toLowerCase()}@{org_slug}.sheepdoggo.app
                   Example: johnsmith@mychurch.sheepdoggo.app

Phone OTP:         {digits}@phone.sheepdoggo.app
                   Example: 15551234567@phone.sheepdoggo.app
                   (digits = phone with all non-digits removed)
```

Both stored in `auth.users.email`. Phone OTP also sets `auth.users.phone`.
