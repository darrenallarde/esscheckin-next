/**
 * ChMS Integration Types
 *
 * Provider-agnostic normalized data models for Church Management System integration.
 * Every adapter (Rock, PCO, CCB) normalizes their API responses into these shapes.
 *
 * Key design decisions:
 * - externalId is always a string (Rock uses int, PCO uses string, CCB uses int)
 * - Phone numbers normalized to E.164 by each adapter
 * - familyRole simplified to 'adult' | 'child' (providers have richer models)
 * - Grade stored as string (providers handle grade/graduation-year differently)
 */

// =============================================================================
// PROVIDER CONFIG
// =============================================================================

export type ChmsProvider = "rock" | "planning_center" | "ccb";

export const PROVIDER_DISPLAY_NAMES: Record<ChmsProvider, string> = {
  rock: "Rock RMS",
  planning_center: "Planning Center",
  ccb: "CCB (Pushpay)",
};

export const PROVIDER_DESCRIPTIONS: Record<ChmsProvider, string> = {
  rock: "Open-source, self-hosted church management system",
  planning_center: "Cloud-based church management platform",
  ccb: "Church Community Builder by Pushpay",
};

// =============================================================================
// NORMALIZED DATA MODELS
// =============================================================================

export interface NormalizedAddress {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
  type?: "home" | "work" | "other";
}

/**
 * Universal person representation. Every adapter normalizes to this.
 *
 * Field sources by provider:
 * - Rock: /api/People with $expand=PhoneNumbers&loadAttributes=simple
 * - PCO: /people/v2/people?include=emails,phone_numbers,addresses (JSON:API)
 * - CCB: ?srv=individual_profiles (XML)
 */
export interface NormalizedPerson {
  externalId: string; // Rock PersonId, PCO id, CCB individual_id
  externalAliasId?: string; // Rock PersonAliasId (critical for Rock API calls)
  externalGuid?: string; // Rock Guid
  firstName: string;
  lastName: string;
  nickname?: string;
  email?: string;
  phone?: string; // Normalized to E.164 by adapter
  gender?: "male" | "female";
  birthDate?: string; // ISO 8601 date (YYYY-MM-DD)
  grade?: string; // String grade level
  graduationYear?: number; // For calculating grade if grade not directly available
  campus?: { id: string; name: string };
  familyId?: string; // External family/household ID
  familyRole?: "adult" | "child"; // Simplified from provider-specific roles
  addresses?: NormalizedAddress[];
  customFields?: Record<string, string>;
  // Metadata for sync
  externalCreatedAt?: string;
  externalUpdatedAt?: string;
}

/**
 * Universal family/household representation.
 *
 * Provider family models:
 * - Rock: Groups with GroupType=Family, members have Adult/Child GroupRole
 * - PCO: Households with primary_contact + members
 * - CCB: Families with h(head)/s(spouse)/c(child)/o(other) positions
 */
export interface NormalizedFamily {
  externalId: string;
  name: string;
  members: NormalizedFamilyMember[];
}

export interface NormalizedFamilyMember {
  externalPersonId: string;
  role: "head" | "spouse" | "child" | "other";
  firstName: string;
  lastName: string;
}

/**
 * Universal group representation.
 *
 * Provider group models:
 * - Rock: Groups + GroupMembers with GroupRole
 * - PCO: Groups + Memberships
 * - CCB: Groups + Participants
 */
export interface NormalizedGroup {
  externalId: string;
  name: string;
  description?: string;
  groupType?: string;
  campus?: { id: string; name: string };
  members: NormalizedGroupMember[];
}

export interface NormalizedGroupMember {
  externalPersonId: string;
  role: "leader" | "member";
}

// =============================================================================
// PROVIDER CAPABILITIES
// =============================================================================

/**
 * Declares what each provider can and can't do.
 * The sync engine uses this to skip unsupported operations.
 *
 * Critical differences:
 * - PCO Check-Ins API is READ-ONLY — we cannot write attendance to PCO
 * - CCB has only 12 custom text fields (udf_text_1..12)
 * - Only PCO supports webhooks natively
 * - Rock has a rich Interactions API for activity logging
 */
export interface ProviderCapabilities {
  canWriteAttendance: boolean; // Rock: yes, PCO: NO, CCB: yes
  canWriteInteractions: boolean; // Rock: yes (Interactions API), PCO: no, CCB: no
  canWriteCustomFields: boolean; // All: yes (but CCB limited)
  customFieldSlots: number; // Rock: Infinity, PCO: Infinity, CCB: 12
  hasWebhooks: boolean; // Rock: no, PCO: yes, CCB: no
  hasIncrementalSync: boolean; // All: yes (modifiedSince / updated_at)
  maxPageSize: number; // Rock: ~100, PCO: 100, CCB: 100
  rateLimit: {
    perMinute?: number; // Rock: server-dependent, PCO: ~300
    perDay?: number; // CCB: 10,000 (!!)
  };
}

// =============================================================================
// CONNECTION & CREDENTIAL TYPES
// =============================================================================

/**
 * Stored in chms_connections table. Credentials are JSONB — shape varies by provider.
 */
export interface ChmsConnection {
  id: string;
  organization_id: string;
  provider: ChmsProvider;
  display_name: string | null;
  base_url: string | null;
  is_active: boolean;
  sync_config: SyncConfig;
  auto_sync_enabled: boolean;
  auto_sync_interval_hours: number;
  last_sync_at: string | null;
  last_sync_status: "success" | "partial" | "error" | null;
  last_sync_error: string | null;
  last_sync_stats: SyncStats | null;
  connection_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Connection with credentials — only returned by service-role edge functions.
 * NEVER sent to the frontend.
 */
export interface ChmsConnectionWithCredentials {
  id: string;
  provider: ChmsProvider;
  base_url: string | null;
  credentials: RockCredentials | PcoCredentials | CcbCredentials;
  sync_config: SyncConfig;
  is_active: boolean;
}

// Provider-specific credential shapes
export interface RockCredentials {
  api_key: string;
}

export interface PcoCredentials {
  app_id: string;
  secret: string;
}

export interface CcbCredentials {
  username: string;
  password: string;
}

// =============================================================================
// SYNC CONFIGURATION
// =============================================================================

/**
 * Provider-specific sync settings stored in chms_connections.sync_config.
 * Controls which groups/campuses to import, field mappings, etc.
 */
export interface SyncConfig {
  // Rock-specific
  rockGroupTypeIds?: number[]; // Which GroupType IDs to import (e.g., youth ministry groups)
  rockPersonAttributeKey?: string; // Key for SheepDoggo external ID attribute

  // PCO-specific
  pcoListIds?: string[]; // Which PCO Lists to import from
  pcoTabId?: string; // Custom tab ID for SheepDoggo fields

  // CCB-specific
  ccbGroupIds?: number[]; // Which CCB groups to import

  // Universal
  campusMapping?: Record<string, string>; // External campus ID → SheepDoggo campus_id
  importFilter?: "all" | "groups_only"; // Import all people or only those in specified groups
  lastIncrementalSyncAt?: string; // ISO timestamp for incremental sync cursor
}

// =============================================================================
// SYNC STATS & LOG
// =============================================================================

export interface SyncStats {
  created: number;
  updated: number;
  linked: number;
  skipped: number;
  failed: number;
}

export interface SyncLogEntry {
  id: string;
  sync_type:
    | "import_people"
    | "import_families"
    | "write_back"
    | "incremental"
    | "test_connection";
  provider: ChmsProvider;
  records_processed: number;
  records_created: number;
  records_updated: number;
  records_linked: number;
  records_skipped: number;
  records_failed: number;
  error_details: Array<{ externalId: string; error: string }> | null;
  started_at: string;
  completed_at: string | null;
  trigger_method: "manual" | "auto" | "webhook" | null;
}

// =============================================================================
// ACTIVITY WRITE-BACK
// =============================================================================

/**
 * Activity data to push back to ChMS.
 * Adapters translate this into provider-specific API calls.
 */
export interface ActivityWriteBack {
  externalPersonId: string;
  externalAliasId?: string; // Rock needs this for attribute writes
  lastCheckIn?: string; // ISO date of last SheepDoggo check-in
  lastText?: string; // ISO date of last SMS
  belongingStatus?: string; // "connected" | "casual" | "mia" etc.
  totalPoints?: number;
  totalCheckIns?: number;
  // Rock-only: detailed interaction
  interaction?: {
    summary: string; // e.g., "Checked in via SheepDoggo"
    date: string;
    channelName: string; // "SheepDoggo"
    componentName: string; // "Check-In" | "SMS" | "Quest"
  };
}
