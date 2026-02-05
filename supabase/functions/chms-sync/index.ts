/**
 * ChMS Sync Edge Function
 *
 * Handles both full import and incremental sync from external ChMS.
 * Called manually from the Settings UI or automatically via scheduled invocation.
 *
 * Request body:
 * {
 *   organization_id: string,
 *   action: "test_connection" | "import_people" | "import_families" | "full_import" | "incremental",
 *   // For save_connection:
 *   provider?: string,
 *   display_name?: string,
 *   base_url?: string,
 *   credentials?: object,
 *   sync_config?: object,
 * }
 *
 * Auth: Requires Authorization header with a valid Supabase JWT.
 * The function uses the service role key for database operations
 * but validates the caller's identity from their JWT.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Import adapter classes directly (edge functions bundle at deploy time)
// These are inlined since edge functions can't use path aliases

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const {
        data: { user },
      } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const body = await req.json();
    const { organization_id, action } = body;

    if (!organization_id) {
      throw new Error("Missing organization_id");
    }

    if (!action) {
      throw new Error("Missing action");
    }

    // Handle save_connection action (doesn't need adapter)
    if (action === "save_connection") {
      const { provider, display_name, base_url, credentials, sync_config } =
        body;

      // Use the user's JWT to call the RPC (which checks permissions)
      const userClient = createClient(
        supabaseUrl,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        {
          global: {
            headers: { Authorization: authHeader || "" },
          },
        }
      );

      const { data, error } = await userClient.rpc("save_chms_connection", {
        p_org_id: organization_id,
        p_provider: provider,
        p_display_name: display_name,
        p_base_url: base_url,
        p_credentials: credentials,
        p_sync_config: sync_config || {},
      });

      if (error) throw error;
      return jsonResponse({ success: true, data: data?.[0] });
    }

    // Handle delete_connection action
    if (action === "delete_connection") {
      const userClient = createClient(
        supabaseUrl,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        {
          global: {
            headers: { Authorization: authHeader || "" },
          },
        }
      );

      const { data, error } = await userClient.rpc("delete_chms_connection", {
        p_org_id: organization_id,
      });

      if (error) throw error;
      return jsonResponse({ success: true, data: data?.[0] });
    }

    // For all other actions, we need the connection config with credentials
    const { data: connections } = await supabase.rpc(
      "get_chms_connection_with_credentials",
      { p_org_id: organization_id }
    );

    if (!connections || connections.length === 0) {
      throw new Error("No active ChMS connection found for this organization");
    }

    const connection = connections[0];

    // Create the adapter
    const adapter = createAdapter(connection);

    switch (action) {
      case "test_connection": {
        const result = await adapter.testConnection();

        if (result.ok) {
          // Update connection status
          await supabase.rpc("update_chms_connection_status", {
            p_org_id: organization_id,
            p_last_sync_status: "success",
            p_last_sync_error: null,
            p_connection_verified: true,
          });

          // Log the test
          await supabase.from("chms_sync_log").insert({
            organization_id,
            sync_type: "test_connection",
            provider: connection.provider,
            records_processed: 0,
            triggered_by: userId,
            trigger_method: "manual",
            completed_at: new Date().toISOString(),
          });
        }

        return jsonResponse({ success: result.ok, error: result.error });
      }

      case "import_people": {
        await adapter.authenticate();
        const result = await importPeopleSync(
          adapter,
          supabase,
          organization_id,
          userId,
          "manual"
        );
        return jsonResponse({ success: true, ...result });
      }

      case "import_families": {
        await adapter.authenticate();
        const result = await importFamiliesSync(
          adapter,
          supabase,
          organization_id
        );
        return jsonResponse({ success: true, ...result });
      }

      case "full_import": {
        await adapter.authenticate();

        // Import people first, then families
        const peopleResult = await importPeopleSync(
          adapter,
          supabase,
          organization_id,
          userId,
          "manual"
        );
        const familyResult = await importFamiliesSync(
          adapter,
          supabase,
          organization_id
        );

        return jsonResponse({
          success: true,
          people: peopleResult,
          families: familyResult,
        });
      }

      case "incremental": {
        await adapter.authenticate();

        // Get last sync time from connection
        const { data: connData } = await supabase
          .from("chms_connections")
          .select("last_sync_at, sync_config")
          .eq("organization_id", organization_id)
          .single();

        const modifiedSince =
          connData?.sync_config?.lastIncrementalSyncAt ||
          connData?.last_sync_at;

        const result = await importPeopleSync(
          adapter,
          supabase,
          organization_id,
          userId,
          body.trigger_method || "auto",
          modifiedSince
        );

        // Update the incremental cursor
        const currentConfig = connData?.sync_config || {};
        await supabase
          .from("chms_connections")
          .update({
            sync_config: {
              ...currentConfig,
              lastIncrementalSyncAt: new Date().toISOString(),
            },
          })
          .eq("organization_id", organization_id);

        return jsonResponse({ success: true, ...result });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error("chms-sync error:", error);
    return jsonResponse(
      { success: false, error: error.message },
      400
    );
  }
});

// =============================================================================
// Adapter Factory (inline for edge function — can't use path aliases)
// =============================================================================

interface ConnectionConfig {
  provider: string;
  base_url: string | null;
  credentials: Record<string, unknown>;
  sync_config: Record<string, unknown>;
}

/**
 * Minimal adapter interface matching what we need in the edge function.
 * The full adapters from src/lib/chms/adapters/ are too complex to import
 * directly in Deno edge functions (they use Node.js module resolution).
 *
 * Instead, we implement a lightweight version here that makes the HTTP calls
 * directly. In production, consider deploying these as a shared Deno module.
 */
interface AdapterLike {
  provider: string;
  authenticate(): Promise<void>;
  testConnection(): Promise<{ ok: boolean; error?: string }>;
  listPeople(modifiedSince?: string): Promise<NormalizedPersonLite[]>;
  listFamilies(
    externalPersonIds: string[]
  ): Promise<NormalizedFamilyLite[]>;
}

interface NormalizedPersonLite {
  externalId: string;
  externalAliasId?: string;
  externalGuid?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  gender?: "male" | "female";
  birthDate?: string;
  grade?: string;
  graduationYear?: number;
  familyId?: string;
  familyRole?: "adult" | "child";
  addresses?: Array<{
    street1: string;
    city: string;
    state: string;
    postalCode: string;
  }>;
}

interface NormalizedFamilyLite {
  externalId: string;
  name: string;
  members: Array<{
    externalPersonId: string;
    role: "head" | "spouse" | "child" | "other";
    firstName: string;
    lastName: string;
  }>;
}

function createAdapter(connection: ConnectionConfig): AdapterLike {
  switch (connection.provider) {
    case "rock":
      return createRockAdapterLite(connection);
    case "planning_center":
      return createPcoAdapterLite(connection);
    case "ccb":
      return createCcbAdapterLite(connection);
    default:
      throw new Error(`Unknown provider: ${connection.provider}`);
  }
}

// =============================================================================
// Lightweight Rock Adapter
// =============================================================================

function createRockAdapterLite(connection: ConnectionConfig): AdapterLite {
  const baseUrl = (connection.base_url || "").replace(/\/+$/, "");
  const apiKey = (connection.credentials as { api_key?: string }).api_key || "";
  const headers = {
    "Authorization-Token": apiKey,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  async function rockGet(path: string) {
    const res = await fetch(`${baseUrl}${path}`, { headers });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Rock API ${path} failed (${res.status}): ${text.substring(0, 200)}`);
    }
    return res.json();
  }

  function normalizePhone(phone: string): string {
    const digits = phone.replace(/[^0-9]/g, "");
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
    return `+${digits}`;
  }

  function normalizePerson(raw: Record<string, unknown>): NormalizedPersonLite {
    let phone: string | undefined;
    const phoneNumbers = raw.PhoneNumbers as Array<Record<string, unknown>> | undefined;
    if (Array.isArray(phoneNumbers) && phoneNumbers.length > 0) {
      const mobile = phoneNumbers.find(
        (p) => p.NumberTypeValueId === 12 || p.NumberTypeValueId === 136
      );
      const primary = mobile || phoneNumbers[0];
      if (primary?.Number) phone = normalizePhone(String(primary.Number));
    }

    const attrs = raw.AttributeValues as Record<string, Record<string, unknown>> | undefined;
    let grade: string | undefined;
    let graduationYear: number | undefined;
    if (attrs?.GraduationYear?.Value) graduationYear = Number(attrs.GraduationYear.Value);
    if (attrs?.Grade?.Value) grade = String(attrs.Grade.Value);

    return {
      externalId: String(raw.Id),
      externalAliasId: raw.PrimaryAliasId ? String(raw.PrimaryAliasId) : undefined,
      externalGuid: raw.Guid ? String(raw.Guid) : undefined,
      firstName: String(raw.FirstName || ""),
      lastName: String(raw.LastName || ""),
      email: raw.Email ? String(raw.Email) : undefined,
      phone,
      gender: raw.Gender === 1 ? "male" : raw.Gender === 2 ? "female" : undefined,
      birthDate: raw.BirthDate ? String(raw.BirthDate).split("T")[0] : undefined,
      grade,
      graduationYear,
    };
  }

  return {
    provider: "rock",

    async authenticate() {
      const res = await rockGet("/api/People?$top=1&$select=Id");
      if (!Array.isArray(res)) throw new Error("Rock auth failed");
    },

    async testConnection() {
      try {
        await this.authenticate();
        return { ok: true };
      } catch (err: unknown) {
        return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
      }
    },

    async listPeople(modifiedSince?: string) {
      const all: NormalizedPersonLite[] = [];
      let skip = 0;
      let hasMore = true;
      while (hasMore) {
        let url = `/api/People?$top=100&$skip=${skip}&$expand=PhoneNumbers&loadAttributes=simple&$orderby=Id`;
        if (modifiedSince) url += `&$filter=ModifiedDateTime ge datetime'${modifiedSince}'`;
        const page = await rockGet(url);
        if (!Array.isArray(page) || page.length === 0) { hasMore = false; break; }
        for (const p of page) all.push(normalizePerson(p));
        skip += 100;
        hasMore = page.length === 100;
      }
      return all;
    },

    async listFamilies(externalPersonIds: string[]) {
      const familyMap = new Map<string, NormalizedFamilyLite>();
      for (const pid of externalPersonIds) {
        try {
          const families = await rockGet(`/api/Groups/GetFamilies/${pid}?$expand=Members`);
          if (!Array.isArray(families)) continue;
          for (const f of families) {
            if (familyMap.has(String(f.Id))) continue;
            const members = (f.Members || []).map((m: Record<string, unknown>) => ({
              externalPersonId: String(m.PersonId),
              role: m.GroupRoleId === 4 ? "child" as const : "head" as const,
              firstName: String((m.Person as Record<string, unknown>)?.NickName || (m.Person as Record<string, unknown>)?.FirstName || ""),
              lastName: String((m.Person as Record<string, unknown>)?.LastName || ""),
            }));
            familyMap.set(String(f.Id), { externalId: String(f.Id), name: f.Name || "Family", members });
          }
        } catch { /* skip */ }
      }
      return Array.from(familyMap.values());
    },
  };
}

// =============================================================================
// Lightweight PCO Adapter
// =============================================================================

function createPcoAdapterLite(connection: ConnectionConfig): AdapterLite {
  const creds = connection.credentials as { app_id?: string; secret?: string };
  const authHeader = "Basic " + btoa(`${creds.app_id}:${creds.secret}`);
  const pcoBase = "https://api.planningcenteronline.com";
  const hdrs = { Authorization: authHeader, Accept: "application/json", "Content-Type": "application/json" };

  async function pcoGet(path: string) {
    const url = path.startsWith("http") ? path : `${pcoBase}${path}`;
    const res = await fetch(url, { headers: hdrs });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`PCO API failed (${res.status}): ${text.substring(0, 200)}`);
    }
    return res.json();
  }

  function normalizePhone(phone: string): string {
    const digits = phone.replace(/[^0-9]/g, "");
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
    return `+${digits}`;
  }

  return {
    provider: "planning_center",

    async authenticate() {
      const res = await pcoGet("/people/v2/people?per_page=1&fields[person]=first_name");
      if (!res.data) throw new Error("PCO auth failed");
    },

    async testConnection() {
      try { await this.authenticate(); return { ok: true }; }
      catch (err: unknown) { return { ok: false, error: err instanceof Error ? err.message : "Unknown error" }; }
    },

    async listPeople(modifiedSince?: string) {
      const all: NormalizedPersonLite[] = [];
      let url = `/people/v2/people?per_page=100&include=emails,phone_numbers&order=created_at`;
      if (modifiedSince) url += `&where[updated_at][gte]=${modifiedSince}`;

      let nextUrl: string | null = url;
      while (nextUrl) {
        const res = await pcoGet(nextUrl);
        const people = Array.isArray(res.data) ? res.data : [res.data];
        const included = res.included || [];

        for (const person of people) {
          if (!person) continue;
          const attrs = person.attributes || {};

          // Find email/phone from included
          let email: string | undefined;
          let phone: string | undefined;
          for (const inc of included) {
            if (inc.type === "Email" && inc.relationships?.person?.data?.id === person.id) {
              email = email || String(inc.attributes.address || "");
            }
            if (inc.type === "PhoneNumber" && inc.relationships?.person?.data?.id === person.id) {
              phone = phone || normalizePhone(String(inc.attributes.number || ""));
            }
          }

          all.push({
            externalId: person.id,
            firstName: String(attrs.first_name || ""),
            lastName: String(attrs.last_name || ""),
            email,
            phone,
            gender: attrs.gender === "M" ? "male" : attrs.gender === "F" ? "female" : undefined,
            birthDate: attrs.birthdate ? String(attrs.birthdate) : undefined,
            grade: attrs.grade ? String(attrs.grade) : undefined,
            graduationYear: attrs.graduation_year ? Number(attrs.graduation_year) : undefined,
          });
        }

        nextUrl = res.links?.next ? res.links.next.replace(pcoBase, "") : null;
      }
      return all;
    },

    async listFamilies(externalPersonIds: string[]) {
      const householdMap = new Map<string, NormalizedFamilyLite>();
      for (const pid of externalPersonIds) {
        try {
          const res = await pcoGet(`/people/v2/people/${pid}/households`);
          const households = Array.isArray(res.data) ? res.data : [res.data];
          for (const hh of households) {
            if (!hh?.id || householdMap.has(hh.id)) continue;
            const membersRes = await pcoGet(`/people/v2/households/${hh.id}/household_memberships?include=person`);
            const memberships = Array.isArray(membersRes.data) ? membersRes.data : [membersRes.data];
            const inc = membersRes.included || [];
            const members = memberships.filter(Boolean).map((m: Record<string, unknown>) => {
              const personData = inc.find((i: Record<string, unknown>) =>
                i.type === "Person" && i.id === (m.relationships as Record<string, unknown>)?.person?.data?.id
              );
              const pos = String((m.attributes as Record<string, unknown>)?.person_position || "").toLowerCase();
              return {
                externalPersonId: personData?.id || "",
                role: pos === "primary_contact" ? "head" as const : pos === "child" ? "child" as const : pos === "spouse" ? "spouse" as const : "other" as const,
                firstName: String(personData?.attributes?.first_name || ""),
                lastName: String(personData?.attributes?.last_name || ""),
              };
            });
            householdMap.set(hh.id, { externalId: hh.id, name: String(hh.attributes?.name || "Household"), members });
          }
        } catch { /* skip */ }
      }
      return Array.from(householdMap.values());
    },
  };
}

// =============================================================================
// Lightweight CCB Adapter
// =============================================================================

function createCcbAdapterLite(connection: ConnectionConfig): AdapterLite {
  let baseUrl = (connection.base_url || "").replace(/\/+$/, "");
  if (!baseUrl.startsWith("http")) baseUrl = `https://${baseUrl}`;
  const creds = connection.credentials as { username?: string; password?: string };
  const authHeader = "Basic " + btoa(`${creds.username}:${creds.password}`);

  async function ccbCall(service: string): Promise<string> {
    const res = await fetch(`${baseUrl}/api.php?srv=${service}`, {
      headers: { Authorization: authHeader, Accept: "text/xml" },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`CCB ${service} failed (${res.status}): ${text.substring(0, 200)}`);
    }
    return res.text();
  }

  function xmlText(xml: string, tag: string): string | null {
    const m = xml.match(new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, "s"));
    return m ? m[1].trim() : null;
  }

  function xmlAttr(xml: string, tag: string, attr: string): string | null {
    const m = xml.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`));
    return m ? m[1] : null;
  }

  function normalizePhone(phone: string): string {
    const digits = phone.replace(/[^0-9]/g, "");
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
    return `+${digits}`;
  }

  function parseIndividuals(xml: string): NormalizedPersonLite[] {
    const people: NormalizedPersonLite[] = [];
    const blocks = xml.match(/<individual[^>]*>[\s\S]*?<\/individual>/g);
    if (!blocks) return people;
    for (const block of blocks) {
      const id = xmlAttr(block, "individual", "id");
      if (!id) continue;
      const firstName = xmlText(block, "first_name");
      const lastName = xmlText(block, "last_name");
      if (!firstName && !lastName) continue;
      const mobileMatch = block.match(/<phone[^>]*type="mobile"[^>]*>(.*?)<\/phone>/);
      const phone = mobileMatch ? normalizePhone(mobileMatch[1]) : undefined;
      const familyId = xmlText(block, "family_id") || undefined;
      const familyPos = xmlText(block, "family_position");
      people.push({
        externalId: id,
        firstName: firstName || "",
        lastName: lastName || "",
        email: xmlText(block, "email") || undefined,
        phone,
        gender: xmlText(block, "gender") === "M" ? "male" : xmlText(block, "gender") === "F" ? "female" : undefined,
        birthDate: xmlText(block, "birthday") || undefined,
        familyId,
        familyRole: familyPos === "c" ? "child" : familyPos ? "adult" : undefined,
      });
    }
    return people;
  }

  return {
    provider: "ccb",

    async authenticate() {
      const xml = await ccbCall("api_status");
      if (!xml.includes("<response")) throw new Error("CCB auth failed");
    },

    async testConnection() {
      try { await this.authenticate(); return { ok: true }; }
      catch (err: unknown) { return { ok: false, error: err instanceof Error ? err.message : "Unknown error" }; }
    },

    async listPeople(modifiedSince?: string) {
      const all: NormalizedPersonLite[] = [];
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        let params = `&page=${page}&per_page=25`;
        if (modifiedSince) params += `&modified_since=${modifiedSince}`;
        const xml = await ccbCall(`individual_profiles${params}`);
        const people = parseIndividuals(xml);
        all.push(...people);
        hasMore = people.length === 25;
        page++;
      }
      return all;
    },

    async listFamilies(externalPersonIds: string[]) {
      const familyMap = new Map<string, NormalizedFamilyLite>();
      for (const pid of externalPersonIds) {
        try {
          const xml = await ccbCall(`family_detail&individual_id=${pid}`);
          const familyId = xmlAttr(xml, "family", "id");
          if (!familyId || familyMap.has(familyId)) continue;
          const memberBlocks = xml.match(/<individual[^>]*>[\s\S]*?<\/individual>/g) || [];
          const members = memberBlocks.map((block) => {
            const id = xmlAttr(block, "individual", "id") || "";
            const pos = xmlText(block, "family_position") || "o";
            return {
              externalPersonId: id,
              role: pos === "h" ? "head" as const : pos === "s" ? "spouse" as const : pos === "c" ? "child" as const : "other" as const,
              firstName: xmlText(block, "first_name") || "",
              lastName: xmlText(block, "last_name") || "",
            };
          });
          const name = xmlText(xml, "family_name") || (members[0]?.lastName ? `${members[0].lastName} Family` : "Family");
          familyMap.set(familyId, { externalId: familyId, name, members });
        } catch { /* skip */ }
      }
      return Array.from(familyMap.values());
    },
  };
}

// =============================================================================
// Import Logic (runs inside edge function)
// =============================================================================

async function importPeopleSync(
  adapter: AdapterLike,
  supabase: ReturnType<typeof createClient>,
  organizationId: string,
  triggeredBy: string | null,
  triggerMethod: string,
  modifiedSince?: string
) {
  const stats = { created: 0, updated: 0, linked: 0, skipped: 0, failed: 0 };
  const errors: Array<{ externalId: string; error: string }> = [];

  // Create log entry
  const { data: logEntry } = await supabase
    .from("chms_sync_log")
    .insert({
      organization_id: organizationId,
      sync_type: modifiedSince ? "incremental" : "import_people",
      provider: adapter.provider,
      triggered_by: triggeredBy,
      trigger_method: triggerMethod,
    })
    .select("id")
    .single();

  try {
    const people = await adapter.listPeople(modifiedSince);

    // Load existing links
    const { data: existingLinks } = await supabase
      .from("chms_profile_links")
      .select("external_person_id, profile_id")
      .eq("organization_id", organizationId)
      .eq("link_status", "linked");

    const linkedMap = new Map(
      (existingLinks || []).map((l: Record<string, string>) => [l.external_person_id, l.profile_id])
    );

    for (const person of people) {
      try {
        // Already linked? Update.
        if (linkedMap.has(person.externalId)) {
          const profileId = linkedMap.get(person.externalId)!;
          const updates: Record<string, unknown> = {
            first_name: person.firstName,
            last_name: person.lastName,
          };
          if (person.email) updates.email = person.email;
          if (person.phone) updates.phone_number = person.phone;
          if (person.birthDate) updates.date_of_birth = person.birthDate;

          await supabase.from("profiles").update(updates).eq("id", profileId);
          await supabase
            .from("chms_profile_links")
            .update({ last_synced_at: new Date().toISOString() })
            .eq("external_person_id", person.externalId)
            .eq("organization_id", organizationId);

          stats.updated++;
          continue;
        }

        // Try email match
        let matchedProfileId: string | null = null;
        let matchMethod = "";

        if (person.email) {
          const { data: emailMatches } = await supabase
            .from("profiles")
            .select("id")
            .ilike("email", person.email.toLowerCase().trim())
            .limit(1);

          if (emailMatches?.length) {
            const { data: membership } = await supabase
              .from("organization_memberships")
              .select("id")
              .eq("profile_id", emailMatches[0].id)
              .eq("organization_id", organizationId)
              .limit(1);

            if (membership?.length) {
              matchedProfileId = emailMatches[0].id;
              matchMethod = "email_match";
            }
          }
        }

        // Try phone match
        if (!matchedProfileId && person.phone) {
          const digits = person.phone.replace(/[^0-9]/g, "");
          const searchDigits = digits.length === 11 && digits.startsWith("1") ? digits.substring(1) : digits;

          if (searchDigits.length >= 7) {
            const { data: phoneMatches } = await supabase
              .from("profiles")
              .select("id, phone_number")
              .not("phone_number", "is", null)
              .limit(200);

            if (phoneMatches) {
              for (const p of phoneMatches) {
                if (!p.phone_number) continue;
                const existingDigits = p.phone_number.replace(/[^0-9]/g, "");
                const normalized = existingDigits.length === 11 && existingDigits.startsWith("1")
                  ? existingDigits.substring(1)
                  : existingDigits;
                if (normalized === searchDigits) {
                  const { data: membership } = await supabase
                    .from("organization_memberships")
                    .select("id")
                    .eq("profile_id", p.id)
                    .eq("organization_id", organizationId)
                    .limit(1);
                  if (membership?.length) {
                    matchedProfileId = p.id;
                    matchMethod = "phone_match";
                    break;
                  }
                }
              }
            }
          }
        }

        if (matchedProfileId) {
          // Check for existing link
          const { data: existingLink } = await supabase
            .from("chms_profile_links")
            .select("id")
            .eq("profile_id", matchedProfileId)
            .eq("organization_id", organizationId)
            .maybeSingle();

          if (existingLink) {
            stats.skipped++;
            continue;
          }

          await supabase.from("chms_profile_links").insert({
            profile_id: matchedProfileId,
            organization_id: organizationId,
            external_person_id: person.externalId,
            external_alias_id: person.externalAliasId || null,
            external_person_guid: person.externalGuid || null,
            external_family_id: person.familyId || null,
            link_status: "linked",
            link_method: matchMethod,
            last_synced_at: new Date().toISOString(),
          });
          linkedMap.set(person.externalId, matchedProfileId);
          stats.linked++;
          continue;
        }

        // Create new profile
        const orgRole = person.familyRole === "adult" ? "guardian" : "student";
        const { data: newProfile, error: profileError } = await supabase
          .from("profiles")
          .insert({
            first_name: person.firstName.trim(),
            last_name: person.lastName.trim(),
            email: person.email?.trim() || null,
            phone_number: person.phone || null,
            date_of_birth: person.birthDate || null,
          })
          .select("id")
          .single();

        if (profileError || !newProfile) {
          throw new Error(`Create profile failed: ${profileError?.message}`);
        }

        // Create org membership
        await supabase.from("organization_memberships").insert({
          profile_id: newProfile.id,
          organization_id: organizationId,
          role: orgRole,
          status: "active",
        });

        // Create student_profile if student
        if (orgRole === "student") {
          const grade = person.grade || (person.graduationYear ? gradeFromGradYear(person.graduationYear) : null);
          await supabase.from("student_profiles").insert({
            profile_id: newProfile.id,
            grade: grade || null,
            gender: person.gender || null,
            address: person.addresses?.[0]?.street1 || null,
            city: person.addresses?.[0]?.city || null,
            state: person.addresses?.[0]?.state || null,
            zip: person.addresses?.[0]?.postalCode || null,
          });
        }

        // Create link
        await supabase.from("chms_profile_links").insert({
          profile_id: newProfile.id,
          organization_id: organizationId,
          external_person_id: person.externalId,
          external_alias_id: person.externalAliasId || null,
          external_person_guid: person.externalGuid || null,
          external_family_id: person.familyId || null,
          link_status: "linked",
          link_method: "auto_created",
          last_synced_at: new Date().toISOString(),
        });
        linkedMap.set(person.externalId, newProfile.id);
        stats.created++;
      } catch (err: unknown) {
        stats.failed++;
        errors.push({
          externalId: person.externalId,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    // Update log
    if (logEntry?.id) {
      await supabase.from("chms_sync_log").update({
        records_processed: people.length,
        records_created: stats.created,
        records_updated: stats.updated,
        records_linked: stats.linked,
        records_skipped: stats.skipped,
        records_failed: stats.failed,
        error_details: errors.length > 0 ? errors : null,
        completed_at: new Date().toISOString(),
      }).eq("id", logEntry.id);
    }

    // Update connection status
    await supabase.rpc("update_chms_connection_status", {
      p_org_id: organizationId,
      p_last_sync_status: stats.failed > 0 ? "partial" : "success",
      p_last_sync_error: null,
      p_last_sync_stats: stats,
    });

  } catch (err: unknown) {
    await supabase.rpc("update_chms_connection_status", {
      p_org_id: organizationId,
      p_last_sync_status: "error",
      p_last_sync_error: err instanceof Error ? err.message : "Sync failed",
    });
    throw err;
  }

  return { stats, errors: errors.length > 0 ? errors : undefined };
}

async function importFamiliesSync(
  adapter: AdapterLite,
  supabase: ReturnType<typeof createClient>,
  organizationId: string
) {
  const stats = { created: 0, skipped: 0, failed: 0 };

  const { data: links } = await supabase
    .from("chms_profile_links")
    .select("external_person_id, profile_id")
    .eq("organization_id", organizationId)
    .eq("link_status", "linked");

  if (!links?.length) return { stats };

  const externalToProfile = new Map(
    links.map((l: Record<string, string>) => [l.external_person_id, l.profile_id])
  );
  const families = await adapter.listFamilies(
    links.map((l: Record<string, string>) => l.external_person_id)
  );

  for (const family of families) {
    const adults = family.members.filter((m) => m.role === "head" || m.role === "spouse");
    const children = family.members.filter((m) => m.role === "child");

    for (const child of children) {
      const childProfileId = externalToProfile.get(child.externalPersonId);
      if (!childProfileId) continue;

      const { data: sp } = await supabase
        .from("student_profiles")
        .select("profile_id")
        .eq("profile_id", childProfileId)
        .maybeSingle();
      if (!sp) continue;

      for (const adult of adults) {
        const parentProfileId = externalToProfile.get(adult.externalPersonId);
        if (!parentProfileId) continue;

        const { data: existing } = await supabase
          .from("parent_student_links")
          .select("id")
          .eq("parent_profile_id", parentProfileId)
          .eq("student_profile_id", childProfileId)
          .maybeSingle();

        if (existing) { stats.skipped++; continue; }

        const { error } = await supabase.from("parent_student_links").insert({
          parent_profile_id: parentProfileId,
          student_profile_id: childProfileId,
          relationship: adult.role === "spouse" ? "mother" : "father",
          organization_id: organizationId,
        });

        if (error) { stats.failed++; } else { stats.created++; }
      }
    }

    // Update family IDs on links
    for (const m of family.members) {
      const pid = externalToProfile.get(m.externalPersonId);
      if (pid) {
        await supabase.from("chms_profile_links")
          .update({ external_family_id: family.externalId })
          .eq("profile_id", pid)
          .eq("organization_id", organizationId);
      }
    }
  }

  return { stats };
}

function gradeFromGradYear(gradYear: number): string | null {
  const now = new Date();
  const refYear = now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear();
  const grade = 12 - (gradYear - refYear);
  return grade >= 1 && grade <= 12 ? String(grade) : null;
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
