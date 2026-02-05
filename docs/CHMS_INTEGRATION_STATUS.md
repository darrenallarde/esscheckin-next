# ChMS Integration - Implementation Status

**Created:** Feb 5, 2026
**Last Updated:** Feb 5, 2026
**Status:** Code complete, edge functions need deployment

---

## What Was Built

### Database (DONE - Applied to both staging + production)
- `chms_connections` - One connection per org
- `chms_profile_links` - Maps profiles to external ChMS person IDs
- `chms_sync_log` - Audit trail
- 6 RPC functions with proper permissions
- Migration file: `supabase/migrations/20260206400000_chms_integration_tables.sql`

### Provider Adapters (DONE)
- `src/lib/chms/types.ts` - All TypeScript interfaces
- `src/lib/chms/provider.ts` - ChmsProviderAdapter interface
- `src/lib/chms/factory.ts` - Adapter factory
- `src/lib/chms/adapters/rock.ts` - Rock RMS adapter
- `src/lib/chms/adapters/planning-center.ts` - Planning Center adapter
- `src/lib/chms/adapters/ccb.ts` - CCB adapter
- `src/lib/chms/field-mapping.ts` - Field mapping utilities
- `src/lib/chms/sync.ts` - Core sync logic

### Edge Functions (DONE - NOT YET DEPLOYED)
- `supabase/functions/chms-sync/index.ts` - Import + sync
- `supabase/functions/chms-write-back/index.ts` - Push activity back

### UI (DONE)
- `src/app/(protected)/[org]/settings/integrations/page.tsx`
- `src/components/settings/ChmsIntegrationSettings.tsx`
- `src/components/settings/ChmsProviderCard.tsx`
- `src/components/settings/ChmsSyncStatus.tsx`
- Settings hub updated with "Integrations" card

### Hooks (DONE)
- `src/hooks/queries/use-chms-connection.ts`
- `src/hooks/mutations/use-chms-sync.ts`

### Git (DONE)
- Committed: `7c42173`
- Pushed to `origin/main`

---

## What's Blocking Testing

### Edge Functions Need Deployment

The `chms-sync` edge function must be deployed to Supabase before the UI can work.

**Deployment failed with:** `Bundle generation timed out`

**Options to deploy:**

1. **Supabase Dashboard (Recommended)**
   - Go to: https://supabase.com/dashboard/project/vilpdnwkfsmvqsiktqdf/functions
   - Create function `chms-sync`
   - Paste contents of `supabase/functions/chms-sync/index.ts`
   - Do the same for `chms-write-back`

2. **Fix Supabase CLI**
   ```bash
   npm install -g supabase
   supabase login
   supabase functions deploy chms-sync --project-ref vilpdnwkfsmvqsiktqdf
   supabase functions deploy chms-write-back --project-ref vilpdnwkfsmvqsiktqdf
   ```

3. **Use Docker** (npx supabase needs Docker for bundling)

---

## Rock RMS Demo Site - Testing Credentials

**URL:** `https://rock.rocksolidchurchdemo.com`

**Web Login:**
- Username: `admin`
- Password: `admin`

**Working API Key:** `C5E93131DC7848B7AF9C5EA71F821ACB`
- This is the `presence` user's key
- Has proper permissions to access the People API

**Non-working API Key:** `OzQsHpCjlyrSuhKfGVaAnahv`
- Darren generated this one
- Associated with a UUID username that lacks API permissions
- Would need security permissions granted in Rock admin

### Verified API Works

```bash
# This returns people successfully:
curl -H "Authorization-Token: C5E93131DC7848B7AF9C5EA71F821ACB" \
  "https://rock.rocksolidchurchdemo.com/api/People?\$top=3&\$select=Id,FirstName,LastName"

# Returns:
# [{"LastName":"Admin","FirstName":"Alisha","Id":1},...]
```

---

## How to Test (Once Edge Functions Deployed)

1. Run `npm run dev` (will use port 3001 if 3000 is busy)
2. Go to `http://localhost:3001/{org-slug}/settings`
3. Click **Integrations** card
4. Select **Rock RMS**
5. Enter:
   - Server URL: `https://rock.rocksolidchurchdemo.com`
   - API Key: `C5E93131DC7848B7AF9C5EA71F821ACB`
6. Click **Save & Test Connection**
7. If verified, click **Import Now**
8. Check People tab for imported records

---

## Files Modified (Not Part of ChMS)

These were already modified before the ChMS work - don't include in ChMS commits:

- `src/app/(protected)/[org]/people/page.tsx`
- `src/components/people/EditPersonModal.tsx`
- `src/components/people/PersonProfileModal.tsx`
- `src/hooks/mutations/use-admin-edit-person.ts`
- `src/hooks/queries/use-people.ts`
- `supabase/migrations/20260206000000_edit_person_add_fields.sql`
- `supabase/migrations/20260206300000_fix_insights_checkin_dates_timezone.sql`

---

## Architecture Summary

```
User clicks "Import" in Settings UI
         ↓
useSaveChmsConnection() mutation
         ↓
Supabase Edge Function: chms-sync
         ↓
createAdapter(connection) → RockAdapter / PcoAdapter / CcbAdapter
         ↓
adapter.listPeople() → Fetch from ChMS API
         ↓
For each person:
  - Match by email, then phone
  - If match → link (chms_profile_links)
  - If no match → create profile + student_profile + org_membership + link
         ↓
adapter.listFamilies() → Create parent_student_links
         ↓
Update chms_sync_log with stats
```

---

## Next Steps

1. Deploy edge functions (see options above)
2. Test with Rock demo site
3. Test error handling (bad credentials, network errors)
4. Test with Planning Center (need PAT credentials)
5. Test with CCB (need church instance)
6. Set up scheduled write-back (cron trigger for chms-write-back)
