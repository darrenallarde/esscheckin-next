# ChMS Integration

Reference for the Church Management System integration. Provider-agnostic adapter pattern supporting Rock RMS, Planning Center Online, and Church Community Builder.

**Status:** Code complete. Edge functions NOT deployed (Supabase CLI bundle timeout). See `docs/CHMS_INTEGRATION_STATUS.md` for deployment details and test credentials.

## Architecture Overview

```
Settings UI → React Query Hooks → Edge Functions → Adapter Factory → Provider Adapters → ChMS APIs
                                        ↓
                                  Supabase Tables
                                  (chms_connections, chms_profile_links, chms_sync_log)
```

Two parallel adapter implementations exist:
- **Node/TypeScript** (`src/lib/chms/`) — full adapters for local dev and future API routes
- **Deno (inline)** (`supabase/functions/chms-sync/index.ts`) — lightweight versions for edge functions (Deno can't import from `src/`)

## Source Files

| Category | Files |
|----------|-------|
| Types & interfaces | `src/lib/chms/types.ts` |
| Adapter factory | `src/lib/chms/factory.ts` |
| Rock RMS adapter | `src/lib/chms/adapters/rock.ts` |
| Planning Center adapter | `src/lib/chms/adapters/planning-center.ts` |
| CCB adapter | `src/lib/chms/adapters/ccb.ts` |
| Sync engine | `src/lib/chms/sync.ts` |
| Field mapping | `src/lib/chms/field-mapping.ts` |
| Query hooks | `src/hooks/queries/use-chms-connection.ts` |
| Mutation hooks | `src/hooks/mutations/use-chms-sync.ts` |
| Settings UI | `src/components/settings/ChmsIntegrationSettings.tsx` |
| Sync edge function | `supabase/functions/chms-sync/index.ts` |
| Write-back edge function | `supabase/functions/chms-write-back/index.ts` |
| Migration | `supabase/migrations/20260206400000_chms_integration_tables.sql` |

## Provider Capability Matrix

| Capability | Rock RMS | Planning Center | CCB |
|-----------|----------|----------------|-----|
| API style | REST + OData | JSON:API 1.0 | XML |
| Auth | `Authorization-Token` header | Basic Auth (PAT) | Basic Auth |
| Base URL | Self-hosted (custom) | `api.planningcenteronline.com` | `{subdomain}.ccbchurch.com` |
| Rate limits | None (self-hosted) | ~300/min | **10,000/day** |
| Max page size | 100 | 100 | 25 |
| Families model | Groups (GroupTypeId=10) | Households | Family positions (h/s/c/o) |
| Custom fields | Attributes (unlimited) | Field definitions (unlimited) | **12 text slots only** |
| Webhooks | No | Yes (People CRUD) | No |
| Write attendance | Yes | **No (read-only)** | Yes |
| Write interactions | Yes (Interactions API) | No (notes only) | No (custom fields only) |
| Incremental sync | `$filter=ModifiedDateTime` | `where[updated_at][gte]=` | `modified_since=` |

## Adapter Interface

Every provider implements `ChmsProviderAdapter`:

```typescript
interface ChmsProviderAdapter {
  readonly provider: ChmsProvider;  // "rock" | "planning_center" | "ccb"

  // Connection
  authenticate(): Promise<void>;
  testConnection(): Promise<{ ok: boolean; error?: string }>;
  capabilities(): ProviderCapabilities;

  // Read (import)
  listPeople(modifiedSince?: string): Promise<NormalizedPerson[]>;
  searchPerson(query: { email?, phone?, firstName?, lastName? }): Promise<NormalizedPerson[]>;
  listFamilies(externalPersonIds: string[]): Promise<NormalizedFamily[]>;
  listGroups(groupTypeIds?: string[]): Promise<NormalizedGroup[]>;

  // Write (write-back)
  createPerson(person: NormalizedPerson): Promise<{ externalId: string }>;
  updatePerson(externalId: string, updates: Partial<NormalizedPerson>): Promise<void>;
  writeActivity(activities: ActivityWriteBack[]): Promise<{ succeeded: number; failed: number }>;
}
```

## Normalized Data Models

All provider responses are normalized to these types before processing:

### NormalizedPerson
```typescript
interface NormalizedPerson {
  externalId: string;           // Provider's person ID
  externalAliasId?: string;     // Rock PersonAliasId (needed for Rock API calls)
  externalGuid?: string;        // Rock Guid
  firstName: string;
  lastName: string;
  nickname?: string;
  email?: string;
  phone?: string;               // Normalized to E.164
  gender?: "male" | "female";
  birthDate?: string;           // ISO 8601
  grade?: string;
  graduationYear?: number;
  campus?: { id: string; name: string };
  familyId?: string;
  familyRole?: "adult" | "child";
  addresses?: NormalizedAddress[];
  customFields?: Record<string, string>;
  externalCreatedAt?: string;
  externalUpdatedAt?: string;
}
```

### NormalizedFamily
```typescript
interface NormalizedFamily {
  externalId: string;
  name: string;
  members: NormalizedFamilyMember[];
}

interface NormalizedFamilyMember {
  externalPersonId: string;
  role: "head" | "spouse" | "child" | "other";
  firstName: string;
  lastName: string;
}
```

## Rock RMS Details

**API:** RESTful with OData query syntax. Self-hosted at customer's URL.

**Auth:** `Authorization-Token: {api_key}` header.

**Key concepts:**
- **PersonAliasId** is used more than PersonId for most operations
- Families = Groups with `GroupTypeId=10`. Member roles: Adult (id=3), Child (id=4)
- Person Attributes: custom key-value fields, loaded with `loadAttributes=simple`
- Gender: 0=Unknown, 1=Male, 2=Female
- `RecordTypeValueId=1` for Person, `RecordStatusValueId=5` for Active
- `NumberTypeValueId=12` for Mobile phone
- POST returns plain text ID (not JSON)

**Key endpoints:**
```
GET  /api/People?$top=100&$expand=PhoneNumbers&loadAttributes=simple&$orderby=Id
GET  /api/People/GetByEmail/{email}
GET  /api/People/GetByPhoneNumber/{digits}
GET  /api/Groups/GetFamilies/{personId}?$expand=Members
POST /api/People/AttributeValue/{personId}  → { Key, Value }
```

**Write-back attributes:** `SheepDoggoLastCheckIn`, `SheepDoggoLastText`, `SheepDoggoBelonging`, `SheepDoggoPoints`, `SheepDoggoCheckIns`

**Demo:** `https://rock.rocksolidchurchdemo.com` (admin/admin), API key: `C5E93131DC7848B7AF9C5EA71F821ACB`

## Planning Center Details

**API:** JSON:API 1.0. Centralized at `api.planningcenteronline.com`.

**Auth:** Basic Auth with Personal Access Token (`app_id:secret`).

**Key concepts:**
- JSON:API format: `data`, `included`, `links`, `meta`
- Emails/phones are separate sub-resources: `include=emails,phone_numbers`
- Households (not families): `/people/v2/households`
- `remote_id` field on Person for storing SheepDoggo `profile_id`
- **Check-Ins API is READ-ONLY** — cannot write attendance
- Webhooks available for People CRUD events
- Gender: "M" or "F"

**Key endpoints:**
```
GET  /people/v2/people?per_page=100&include=emails,phone_numbers
GET  /people/v2/people?where[updated_at][gte]={iso_date}
GET  /people/v2/people?where[search_name_or_email_or_phone_number]={query}
POST /people/v2/people/{id}/notes  → write-back via notes (lightweight)
```

**Rate limit:** 100 requests per 20 seconds (~300/min).

## CCB Details

**API:** XML responses. URL pattern: `https://{subdomain}.ccbchurch.com/api.php?srv={service}`.

**Auth:** Basic Auth (username:password).

**Key concepts:**
- All responses are XML (parsed with regex in Deno — no DOMParser)
- **Only 12 custom text field slots** (`udf_text_1` through `udf_text_12`) for entire org
- Family positions: h=head, s=spouse, c=child, o=other
- `sync_id` and `other_id` for external ID storage
- No webhooks — polling only
- Page size: 25 (smaller than others)

**Custom field mapping:**
```
udf_text_1 = LastCheckIn
udf_text_2 = LastText
udf_text_3 = Belonging
udf_text_4 = Points
udf_text_5 = CheckIns
udf_text_6 = SheepDoggoId
```

**Key endpoints:**
```
GET /api.php?srv=api_status                              → test connection
GET /api.php?srv=individual_profiles&page=1&per_page=25  → list people
GET /api.php?srv=individual_profiles&modified_since={date}
GET /api.php?srv=individual_search&email={email}
GET /api.php?srv=family_detail&individual_id={id}
GET /api.php?srv=update_individual&individual_id={id}&udf_text_1={value}
```

**Rate limit:** **10,000 requests/day.** Strategy for 500 students: ~54 calls/day (initial import ~520 one-time).

## Sync Engine

**Source:** `src/lib/chms/sync.ts`

### Match Priority (Import)

1. **Existing link** — `external_person_id` match in `chms_profile_links` → Update existing profile
2. **Email match** — normalized, case-insensitive against `profiles.email` → Create link
3. **Phone match** — digits-only, strip country code against `profiles.phone_number` → Create link
4. **No match** → Create new profile + org membership + student profile + link

### Import People Flow

```
Fetch people from ChMS
  → For each person:
    → Already linked? → Update profile
    → Email match? → Create link
    → Phone match? → Create link
    → No match? → Create profile + membership + link
  → Update connection status + log
```

### Import Families Flow

```
Get all linked profiles for org
  → Fetch families from ChMS for those people
  → For each family:
    → Identify adults (head/spouse) and children
    → For each child with student profile:
      → Link to each adult as parent_student_link
    → Update external_family_id on profile links
```

### Write-Back Flow (`supabase/functions/chms-write-back/index.ts`)

Pushes SheepDoggo activity back to ChMS. Runs on schedule (every 15 min) or manual trigger.

```
For each active connection:
  → Get linked profiles
  → For each profile:
    → Get latest check-in, SMS, game stats
    → Skip if no new activity since last_write_back_at
  → Batch and send to provider:
    → Rock: POST to /api/People/AttributeValue/{personId}
    → PCO: POST to /people/v2/people/{id}/notes
    → CCB: GET /api.php?srv=update_individual&udf_text_*=...
  → Update last_write_back_at + log
```

## Field Mapping (`src/lib/chms/field-mapping.ts`)

### Grade Calculation
```typescript
// Grade from graduation year (US school system)
function gradeFromGraduationYear(graduationYear: number): string | null
// If past June, reference next year's grad class
// grade = 12 - (graduationYear - referenceYear)
```

### Role Mapping
```
head/spouse → "guardian"
child → "student"
other → check age: <20 = "student", ≥20 = "guardian"
```

### Phone Normalization
```
Strip non-digits → if 11 digits starting with "1", drop the "1" → 10 digits
```

## Edge Functions

### `chms-sync` — 7 actions

| Action | Input | Does |
|--------|-------|------|
| `save_connection` | org_id, provider, credentials, config | Upsert via `save_chms_connection` RPC |
| `delete_connection` | org_id | Delete via `delete_chms_connection` RPC |
| `test_connection` | org_id | Create adapter → `testConnection()` → update `connection_verified_at` |
| `import_people` | org_id | Full people import with match/create logic |
| `import_families` | org_id | Family relationship import |
| `full_import` | org_id | `import_people` then `import_families` |
| `incremental` | org_id | Import since `lastIncrementalSyncAt` cursor |

### `chms-write-back` — Activity push-back

Pushes check-in dates, SMS dates, belonging status, points, total check-ins back to ChMS using provider-specific methods.

## Database Schema

**Migration:** `supabase/migrations/20260206400000_chms_integration_tables.sql`

### Tables

**`chms_connections`** (1 per org)
```sql
id UUID PRIMARY KEY
organization_id UUID UNIQUE NOT NULL    -- One connection per org
provider TEXT                           -- 'rock' | 'planning_center' | 'ccb'
display_name TEXT
base_url TEXT                           -- Rock/CCB URL, null for PCO
credentials JSONB                       -- Provider-specific (encrypted in prod)
is_active BOOLEAN
sync_config JSONB                       -- Provider-specific settings
auto_sync_enabled BOOLEAN
auto_sync_interval_hours INTEGER
last_sync_at, last_sync_status, last_sync_error, last_sync_stats
connection_verified_at TIMESTAMPTZ
```

**`chms_profile_links`** (links SheepDoggo profiles to ChMS people)
```sql
id UUID PRIMARY KEY
profile_id UUID NOT NULL                -- SheepDoggo profile
organization_id UUID NOT NULL
external_person_id TEXT NOT NULL         -- ChMS person ID
external_alias_id TEXT                  -- Rock PersonAliasId
external_person_guid TEXT               -- Rock Guid
external_family_id TEXT                 -- ChMS family/household ID
link_status TEXT                        -- 'linked' | 'unlinked' | 'conflict'
link_method TEXT                        -- 'email_match' | 'phone_match' | 'auto_created' | 'manual'
last_synced_at TIMESTAMPTZ
last_write_back_at TIMESTAMPTZ
UNIQUE (profile_id, organization_id)
UNIQUE (external_person_id, organization_id)
```

**`chms_sync_log`** (audit trail)
```sql
id UUID PRIMARY KEY
organization_id UUID NOT NULL
sync_type TEXT       -- 'import_people' | 'import_families' | 'write_back' | 'incremental' | 'test_connection'
provider TEXT
records_processed, records_created, records_updated, records_linked, records_skipped, records_failed INTEGER
error_details JSONB  -- [{externalId, error}, ...]
started_at, completed_at TIMESTAMPTZ
triggered_by UUID    -- null for auto-sync
trigger_method TEXT   -- 'manual' | 'auto' | 'webhook'
```

### RPCs (6 total)

| RPC | Access | Purpose |
|-----|--------|---------|
| `get_chms_connection(p_org_id)` | Admin/owner | Returns connection WITHOUT credentials |
| `save_chms_connection(...)` | Admin/owner | Upsert connection config |
| `delete_chms_connection(p_org_id)` | Admin/owner | Delete connection + unlink profiles |
| `update_chms_connection_status(...)` | SECURITY DEFINER | Edge function updates sync status |
| `get_chms_sync_history(p_org_id, p_limit)` | Admin/owner | Last N sync log entries |
| `get_chms_connection_with_credentials(p_org_id)` | SECURITY DEFINER | Returns connection WITH credentials (service role only) |

### RLS

All tables have RLS enabled. Admin/owner can CRUD for their org. Service role bypasses.

## Frontend

### Query Hooks (`src/hooks/queries/use-chms-connection.ts`)

```typescript
useChmsConnection(organizationId)      → ChmsConnectionData | null
useChmsSyncHistory(organizationId)     → ChmsSyncLogEntry[]
```

### Mutation Hooks (`src/hooks/mutations/use-chms-sync.ts`)

```typescript
useSaveChmsConnection()     .mutate({ organizationId, provider, displayName, baseUrl, credentials, syncConfig? })
useDeleteChmsConnection()   .mutate(organizationId)
useTestChmsConnection()     .mutate(organizationId)
useChmsImport()             .mutate(organizationId)      // full_import action
useChmsIncrementalSync()    .mutate(organizationId)
```

### Settings UI (`src/components/settings/ChmsIntegrationSettings.tsx`)

Three states:
1. **No connection** — Provider selection cards (Rock / PCO / CCB)
2. **Selected, not saved** — Credential entry form (provider-specific fields)
3. **Connected** — Status display + import controls + disconnect + sync history table

## Security Notes

- Credentials stored in JSONB — encrypt in production (Supabase vault recommended)
- `get_chms_connection` excludes credentials field (never sent to frontend)
- `get_chms_connection_with_credentials` is SECURITY DEFINER (service role only)
- RLS policies enforce org isolation on all 3 tables
- Edge functions require `SUPABASE_SERVICE_ROLE_KEY`

## Deployment Status

**Blocked:** Edge functions not deployed — Supabase CLI timeout error during bundling.

**Workaround options:**
1. Deploy via Supabase Dashboard (paste code directly)
2. Use Docker-based CLI (`npx supabase functions deploy`)
3. Split edge function into smaller modules

See `docs/CHMS_INTEGRATION_STATUS.md` for full status, test credentials, and deployment checklist.
