/**
 * ChMS Sync Engine
 *
 * Core logic for importing people from a ChMS into SheepDoggo.
 * Provider-agnostic — works with any ChmsProviderAdapter.
 *
 * Sync flow:
 * 1. Load connection config + credentials from Supabase
 * 2. Instantiate the correct adapter via factory
 * 3. Fetch people from ChMS (paginated)
 * 4. For each person:
 *    a. Check chms_profile_links — already linked? Update or skip
 *    b. Search existing SheepDoggo profiles by email, then phone
 *    c. If match → link (insert chms_profile_links)
 *    d. If no match → create profile + student_profile + org_membership + link
 * 5. Fetch families for linked people
 * 6. Create parent_student_links from family data
 * 7. Log results to chms_sync_log
 *
 * This module is designed to run inside Supabase edge functions
 * with a service_role client (bypasses RLS).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any; // Edge function uses Deno imports; this type is for reference only
import type { ChmsProviderAdapter } from "./provider";
import type {
  NormalizedPerson,
  NormalizedFamily,
  SyncStats,
  SyncConfig,
} from "./types";
import {
  mapPersonToProfile,
  mapNormalizedRoleToOrgRole,
  mapFamilyRoleToOrgRole,
  normalizeEmail,
  normalizePhoneForMatch,
} from "./field-mapping";

export interface SyncOptions {
  organizationId: string;
  adapter: ChmsProviderAdapter;
  supabase: SupabaseClient;
  modifiedSince?: string; // For incremental sync
  triggeredBy?: string; // User ID
  triggerMethod?: "manual" | "auto" | "webhook";
}

export interface SyncResult {
  stats: SyncStats;
  errors: Array<{ externalId: string; error: string }>;
}

// =============================================================================
// IMPORT PEOPLE
// =============================================================================

export async function importPeople(options: SyncOptions): Promise<SyncResult> {
  const { organizationId, adapter, supabase, modifiedSince, triggeredBy, triggerMethod } =
    options;

  const stats: SyncStats = {
    created: 0,
    updated: 0,
    linked: 0,
    skipped: 0,
    failed: 0,
  };
  const errors: Array<{ externalId: string; error: string }> = [];

  // Create sync log entry
  const { data: logEntry } = await supabase
    .from("chms_sync_log")
    .insert({
      organization_id: organizationId,
      sync_type: modifiedSince ? "incremental" : "import_people",
      provider: adapter.provider,
      triggered_by: triggeredBy || null,
      trigger_method: triggerMethod || "manual",
    })
    .select("id")
    .single();

  try {
    // 1. Fetch people from ChMS
    const people = await adapter.listPeople(modifiedSince);

    // 2. Load existing links for this org
    const { data: existingLinks } = await supabase
      .from("chms_profile_links")
      .select("external_person_id, profile_id, link_status")
      .eq("organization_id", organizationId)
      .eq("link_status", "linked");

    const linkedMap = new Map<string, string>(
      (existingLinks || []).map((l: { external_person_id: string; profile_id: string }) => [
        l.external_person_id,
        l.profile_id,
      ] as [string, string])
    );

    // 3. Process each person
    for (const person of people) {
      try {
        const result = await processOnePerson(
          person,
          organizationId,
          linkedMap,
          supabase
        );

        switch (result) {
          case "created":
            stats.created++;
            break;
          case "linked":
            stats.linked++;
            break;
          case "updated":
            stats.updated++;
            break;
          case "skipped":
            stats.skipped++;
            break;
        }
      } catch (err: unknown) {
        stats.failed++;
        const message = err instanceof Error ? err.message : "Unknown error";
        errors.push({ externalId: person.externalId, error: message });
      }
    }

    // 4. Update sync log
    if (logEntry?.id) {
      await supabase
        .from("chms_sync_log")
        .update({
          records_processed: people.length,
          records_created: stats.created,
          records_updated: stats.updated,
          records_linked: stats.linked,
          records_skipped: stats.skipped,
          records_failed: stats.failed,
          error_details: errors.length > 0 ? errors : null,
          completed_at: new Date().toISOString(),
        })
        .eq("id", logEntry.id);
    }

    // 5. Update connection status
    await supabase.rpc("update_chms_connection_status", {
      p_org_id: organizationId,
      p_last_sync_status: stats.failed > 0 ? "partial" : "success",
      p_last_sync_error: null,
      p_last_sync_stats: stats,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Sync failed";

    // Update connection with error
    await supabase.rpc("update_chms_connection_status", {
      p_org_id: organizationId,
      p_last_sync_status: "error",
      p_last_sync_error: message,
    });

    // Update log entry
    if (logEntry?.id) {
      await supabase
        .from("chms_sync_log")
        .update({
          records_failed: stats.failed,
          error_details: [{ externalId: "sync", error: message }],
          completed_at: new Date().toISOString(),
        })
        .eq("id", logEntry.id);
    }

    throw err;
  }

  return { stats, errors };
}

// =============================================================================
// IMPORT FAMILIES
// =============================================================================

export async function importFamilies(
  options: SyncOptions
): Promise<SyncResult> {
  const { organizationId, adapter, supabase } = options;

  const stats: SyncStats = {
    created: 0,
    updated: 0,
    linked: 0,
    skipped: 0,
    failed: 0,
  };
  const errors: Array<{ externalId: string; error: string }> = [];

  // Get all linked people for this org
  const { data: links } = await supabase
    .from("chms_profile_links")
    .select("external_person_id, profile_id, external_family_id")
    .eq("organization_id", organizationId)
    .eq("link_status", "linked");

  if (!links || links.length === 0) return { stats, errors };

  // Build lookup: external person ID → SheepDoggo profile_id
  const externalToProfile = new Map(
    links.map((l: { external_person_id: string; profile_id: string }) => [
      l.external_person_id,
      l.profile_id,
    ])
  );

  // Fetch families from ChMS
  const externalIds = links.map(
    (l: { external_person_id: string }) => l.external_person_id
  );
  const families = await adapter.listFamilies(externalIds);

  // Create sync log
  const { data: logEntry } = await supabase
    .from("chms_sync_log")
    .insert({
      organization_id: organizationId,
      sync_type: "import_families",
      provider: adapter.provider,
      trigger_method: "manual",
    })
    .select("id")
    .single();

  for (const family of families) {
    try {
      // Identify adults (guardians) and children (students) in this family
      const adults = family.members.filter(
        (m) => m.role === "head" || m.role === "spouse"
      );
      const children = family.members.filter((m) => m.role === "child");

      // For each child linked in SheepDoggo, link their parents
      for (const child of children) {
        const childProfileId = externalToProfile.get(child.externalPersonId);
        if (!childProfileId) continue;

        // Check if child has a student_profile
        const { data: studentProfile } = await supabase
          .from("student_profiles")
          .select("profile_id")
          .eq("profile_id", childProfileId)
          .single();

        if (!studentProfile) continue;

        for (const adult of adults) {
          const parentProfileId = externalToProfile.get(
            adult.externalPersonId
          );
          if (!parentProfileId) continue;

          // Check if link already exists
          const { data: existingLink } = await supabase
            .from("parent_student_links")
            .select("id")
            .eq("parent_profile_id", parentProfileId)
            .eq("student_profile_id", childProfileId)
            .single();

          if (existingLink) {
            stats.skipped++;
            continue;
          }

          // Create parent-student link
          const relationship =
            adult.role === "head" ? "father" : "mother"; // Simplified
          const { error: linkError } = await supabase
            .from("parent_student_links")
            .insert({
              parent_profile_id: parentProfileId,
              student_profile_id: childProfileId,
              relationship,
              organization_id: organizationId,
            });

          if (linkError) {
            stats.failed++;
            errors.push({
              externalId: `${adult.externalPersonId}->${child.externalPersonId}`,
              error: linkError.message,
            });
          } else {
            stats.created++;
          }
        }
      }

      // Update external_family_id on profile links
      for (const member of family.members) {
        const profileId = externalToProfile.get(member.externalPersonId);
        if (profileId) {
          await supabase
            .from("chms_profile_links")
            .update({ external_family_id: family.externalId })
            .eq("profile_id", profileId)
            .eq("organization_id", organizationId);
        }
      }
    } catch (err: unknown) {
      stats.failed++;
      const message = err instanceof Error ? err.message : "Unknown error";
      errors.push({ externalId: family.externalId, error: message });
    }
  }

  // Update log
  if (logEntry?.id) {
    await supabase
      .from("chms_sync_log")
      .update({
        records_processed: families.length,
        records_created: stats.created,
        records_skipped: stats.skipped,
        records_failed: stats.failed,
        error_details: errors.length > 0 ? errors : null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", logEntry.id);
  }

  return { stats, errors };
}

// =============================================================================
// INTERNAL: Process One Person
// =============================================================================

type ProcessResult = "created" | "linked" | "updated" | "skipped";

async function processOnePerson(
  person: NormalizedPerson,
  organizationId: string,
  linkedMap: Map<string, string>,
  supabase: SupabaseClient
): Promise<ProcessResult> {
  // Already linked?
  if (linkedMap.has(person.externalId)) {
    // Update the existing profile with fresh data from ChMS
    const profileId = linkedMap.get(person.externalId)!;
    await updateExistingProfile(person, profileId, supabase);

    // Update sync timestamp
    await supabase
      .from("chms_profile_links")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("external_person_id", person.externalId)
      .eq("organization_id", organizationId);

    return "updated";
  }

  // Try to match by email
  let matchedProfileId: string | null = null;
  let matchMethod: string = "";

  if (person.email) {
    const normalized = normalizeEmail(person.email);
    const { data: emailMatches } = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", normalized)
      .limit(1);

    if (emailMatches && emailMatches.length > 0) {
      // Verify this profile is in the same org
      const { data: membership } = await supabase
        .from("organization_memberships")
        .select("id")
        .eq("profile_id", emailMatches[0].id)
        .eq("organization_id", organizationId)
        .limit(1);

      if (membership && membership.length > 0) {
        matchedProfileId = emailMatches[0].id;
        matchMethod = "email_match";
      }
    }
  }

  // Try to match by phone
  if (!matchedProfileId && person.phone) {
    const normalizedPhone = normalizePhoneForMatch(person.phone);
    if (normalizedPhone.length >= 7) {
      // Search for phone in profiles
      const { data: phoneMatches } = await supabase
        .from("profiles")
        .select("id, phone_number")
        .not("phone_number", "is", null)
        .limit(100);

      if (phoneMatches) {
        for (const profile of phoneMatches) {
          if (!profile.phone_number) continue;
          const existingPhone = normalizePhoneForMatch(profile.phone_number);
          if (existingPhone === normalizedPhone) {
            // Verify org membership
            const { data: membership } = await supabase
              .from("organization_memberships")
              .select("id")
              .eq("profile_id", profile.id)
              .eq("organization_id", organizationId)
              .limit(1);

            if (membership && membership.length > 0) {
              matchedProfileId = profile.id;
              matchMethod = "phone_match";
              break;
            }
          }
        }
      }
    }
  }

  // If matched, create link
  if (matchedProfileId) {
    // Check for existing link (avoid conflicts)
    const { data: existingLink } = await supabase
      .from("chms_profile_links")
      .select("id")
      .eq("profile_id", matchedProfileId)
      .eq("organization_id", organizationId)
      .single();

    if (existingLink) {
      return "skipped"; // Already linked to a different external ID
    }

    await supabase.from("chms_profile_links").insert({
      profile_id: matchedProfileId,
      organization_id: organizationId,
      external_person_id: person.externalId,
      external_alias_id: person.externalAliasId || null,
      external_person_guid: person.externalGuid || null,
      link_status: "linked",
      link_method: matchMethod,
      last_synced_at: new Date().toISOString(),
    });

    linkedMap.set(person.externalId, matchedProfileId);
    return "linked";
  }

  // No match — create new profile + membership + link
  const mapped = mapPersonToProfile(person);
  const orgRole = mapNormalizedRoleToOrgRole(person.familyRole, person.birthDate);

  // Create profile
  const { data: newProfile, error: profileError } = await supabase
    .from("profiles")
    .insert(mapped.profile)
    .select("id")
    .single();

  if (profileError || !newProfile) {
    throw new Error(`Failed to create profile: ${profileError?.message}`);
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
    await supabase.from("student_profiles").insert({
      profile_id: newProfile.id,
      ...mapped.studentProfile,
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
  return "created";
}

// =============================================================================
// INTERNAL: Update existing profile with ChMS data
// =============================================================================

async function updateExistingProfile(
  person: NormalizedPerson,
  profileId: string,
  supabase: SupabaseClient
): Promise<void> {
  const mapped = mapPersonToProfile(person);

  // Only update fields that have values from ChMS (don't overwrite with nulls)
  const profileUpdates: Record<string, unknown> = {};
  if (mapped.profile.email) profileUpdates.email = mapped.profile.email;
  if (mapped.profile.phone_number)
    profileUpdates.phone_number = mapped.profile.phone_number;
  if (mapped.profile.date_of_birth)
    profileUpdates.date_of_birth = mapped.profile.date_of_birth;

  // Always update name (ChMS is authoritative for basic info)
  profileUpdates.first_name = mapped.profile.first_name;
  profileUpdates.last_name = mapped.profile.last_name;

  if (Object.keys(profileUpdates).length > 0) {
    await supabase
      .from("profiles")
      .update(profileUpdates)
      .eq("id", profileId);
  }

  // Update student profile if exists
  const studentUpdates: Record<string, unknown> = {};
  if (mapped.studentProfile.grade)
    studentUpdates.grade = mapped.studentProfile.grade;
  if (mapped.studentProfile.address)
    studentUpdates.address = mapped.studentProfile.address;
  if (mapped.studentProfile.city)
    studentUpdates.city = mapped.studentProfile.city;
  if (mapped.studentProfile.state)
    studentUpdates.state = mapped.studentProfile.state;
  if (mapped.studentProfile.zip)
    studentUpdates.zip = mapped.studentProfile.zip;

  if (Object.keys(studentUpdates).length > 0) {
    await supabase
      .from("student_profiles")
      .update(studentUpdates)
      .eq("profile_id", profileId);
  }
}
