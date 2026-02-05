/**
 * ChMS Provider Interface
 *
 * Every adapter (Rock, PCO, CCB) implements this interface.
 * The sync engine calls these methods without knowing which provider is behind them.
 *
 * Design principles:
 * - All methods return normalized types (NormalizedPerson, NormalizedFamily, etc.)
 * - Pagination is handled internally by each adapter
 * - Authentication is set up once via authenticate()
 * - capabilities() lets the sync engine skip unsupported operations
 * - Errors throw with descriptive messages; the caller handles retries
 */

import type {
  NormalizedPerson,
  NormalizedFamily,
  NormalizedGroup,
  ProviderCapabilities,
  ActivityWriteBack,
  ChmsProvider,
} from "./types";

export interface ChmsProviderAdapter {
  /** Provider identifier */
  readonly provider: ChmsProvider;

  /**
   * Validate credentials and prepare auth headers/tokens.
   * Call this once before any other method.
   * Throws if credentials are invalid or server is unreachable.
   */
  authenticate(): Promise<void>;

  /**
   * Test that the connection is working.
   * Returns true if we can successfully make an authenticated API call.
   * Does NOT throw — returns false with an error message on failure.
   */
  testConnection(): Promise<{ ok: boolean; error?: string }>;

  /**
   * What this provider supports. Used by sync engine to skip
   * unsupported operations (e.g., don't try to write attendance to PCO).
   */
  capabilities(): ProviderCapabilities;

  // =========================================================================
  // READ OPERATIONS (Import)
  // =========================================================================

  /**
   * Fetch all people from the ChMS. Handles pagination internally.
   * For incremental sync, pass modifiedSince to only get changes.
   *
   * @param modifiedSince - ISO timestamp to filter by last-modified date
   * @returns All people (or changed people since modifiedSince)
   */
  listPeople(modifiedSince?: string): Promise<NormalizedPerson[]>;

  /**
   * Search for a person by email or phone.
   * Used during matching to find existing ChMS records for SheepDoggo profiles.
   */
  searchPerson(query: {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<NormalizedPerson[]>;

  /**
   * Fetch family/household data for a set of people.
   * Takes external person IDs and returns their family structures.
   *
   * @param externalPersonIds - IDs of people whose families to fetch
   * @returns Families containing those people
   */
  listFamilies(externalPersonIds: string[]): Promise<NormalizedFamily[]>;

  /**
   * Fetch groups and their members.
   * Optionally filter by group type IDs (Rock) or group IDs (CCB).
   *
   * @param groupTypeIds - Provider-specific group type/category filter
   * @returns Groups with their member lists
   */
  listGroups(groupTypeIds?: string[]): Promise<NormalizedGroup[]>;

  // =========================================================================
  // WRITE OPERATIONS (Write-back)
  // =========================================================================

  /**
   * Create a new person in the ChMS.
   * Returns the new external person ID for linking.
   */
  createPerson(person: NormalizedPerson): Promise<{ externalId: string }>;

  /**
   * Update an existing person's basic info in the ChMS.
   * Used for keeping profiles loosely synced.
   */
  updatePerson(
    externalId: string,
    updates: Partial<NormalizedPerson>
  ): Promise<void>;

  /**
   * Write SheepDoggo activity data back to the ChMS.
   * Each adapter translates this to provider-specific fields:
   * - Rock: Person Attributes + Interactions API
   * - PCO: Custom FieldData on "SheepDoggo" tab
   * - CCB: udf_text_1 through udf_text_6
   *
   * Best-effort: logs errors but doesn't throw (activity write-back is non-critical).
   */
  writeActivity(
    activities: ActivityWriteBack[]
  ): Promise<{ succeeded: number; failed: number }>;
}
