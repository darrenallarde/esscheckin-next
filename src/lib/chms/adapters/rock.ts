/**
 * Rock RMS Adapter
 *
 * Implements ChmsProviderAdapter for Rock RMS (open-source, self-hosted .NET ChMS).
 *
 * API reference: https://www.rockrms.com/Rock/api/docs
 * Demo site: rock.rocksolidchurchdemo.com (admin/admin)
 *
 * Key Rock concepts:
 * - PersonAliasId is used more than PersonId for most API operations
 * - Families are Groups with GroupTypeId=10 (default Family group type)
 * - Members have GroupRole: Adult (id=3) or Child (id=4) in Family groups
 * - Person Attributes are custom key-value fields on Person records
 * - Interactions API has 3 tiers: Channel → Component → Interaction
 * - OData query syntax: $filter, $expand, $select, $top, $skip, $orderby
 * - loadAttributes=simple on Person requests loads attribute values inline
 */

import type {
  ChmsConnectionWithCredentials,
  RockCredentials,
  NormalizedPerson,
  NormalizedFamily,
  NormalizedFamilyMember,
  NormalizedGroup,
  NormalizedGroupMember,
  NormalizedAddress,
  ProviderCapabilities,
  ActivityWriteBack,
  SyncConfig,
} from "../types";
import type { ChmsProviderAdapter } from "../provider";

const PAGE_SIZE = 100;

// Rock Family GroupType is typically 10 (default), but configurable
const DEFAULT_FAMILY_GROUP_TYPE_ID = 10;
// Rock Family GroupRole IDs (default)
const ADULT_ROLE_ID = 3;
const CHILD_ROLE_ID = 4;

export class RockAdapter implements ChmsProviderAdapter {
  readonly provider = "rock" as const;

  private baseUrl: string;
  private apiKey: string;
  private syncConfig: SyncConfig;
  private headers: Record<string, string> = {};

  constructor(connection: ChmsConnectionWithCredentials) {
    if (!connection.base_url) {
      throw new Error("Rock RMS requires a server URL");
    }
    const creds = connection.credentials as RockCredentials;
    if (!creds.api_key) {
      throw new Error("Rock RMS requires an API key");
    }

    // Normalize URL: strip trailing slash
    this.baseUrl = connection.base_url.replace(/\/+$/, "");
    this.apiKey = creds.api_key;
    this.syncConfig = connection.sync_config || {};
  }

  async authenticate(): Promise<void> {
    this.headers = {
      "Authorization-Token": this.apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    // Verify the key works by fetching a lightweight endpoint
    const res = await this.get("/api/People?$top=1&$select=Id");
    if (!Array.isArray(res)) {
      throw new Error("Rock API authentication failed: unexpected response");
    }
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      await this.authenticate();
      return { ok: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return { ok: false, error: message };
    }
  }

  capabilities(): ProviderCapabilities {
    return {
      canWriteAttendance: true,
      canWriteInteractions: true,
      canWriteCustomFields: true,
      customFieldSlots: Infinity,
      hasWebhooks: false,
      hasIncrementalSync: true,
      maxPageSize: PAGE_SIZE,
      rateLimit: {}, // Self-hosted, no standard limits
    };
  }

  // ===========================================================================
  // READ: People
  // ===========================================================================

  async listPeople(modifiedSince?: string): Promise<NormalizedPerson[]> {
    const allPeople: NormalizedPerson[] = [];
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      let url = `/api/People?$top=${PAGE_SIZE}&$skip=${skip}&$expand=PhoneNumbers&loadAttributes=simple&$orderby=Id`;

      if (modifiedSince) {
        url += `&$filter=ModifiedDateTime ge datetime'${modifiedSince}'`;
      }

      const page = await this.get(url);

      if (!Array.isArray(page) || page.length === 0) {
        hasMore = false;
        break;
      }

      for (const person of page) {
        allPeople.push(this.normalizePerson(person));
      }

      skip += PAGE_SIZE;
      hasMore = page.length === PAGE_SIZE;
    }

    return allPeople;
  }

  async searchPerson(query: {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<NormalizedPerson[]> {
    const results: NormalizedPerson[] = [];

    if (query.email) {
      try {
        const byEmail = await this.get(
          `/api/People/GetByEmail/${encodeURIComponent(query.email)}?loadAttributes=simple&$expand=PhoneNumbers`
        );
        if (Array.isArray(byEmail)) {
          for (const p of byEmail) results.push(this.normalizePerson(p));
        }
      } catch {
        // Email search may 404, that's fine
      }
    }

    if (query.phone && results.length === 0) {
      try {
        const cleanPhone = query.phone.replace(/[^0-9]/g, "");
        const byPhone = await this.get(
          `/api/People/GetByPhoneNumber/${encodeURIComponent(cleanPhone)}?loadAttributes=simple&$expand=PhoneNumbers`
        );
        if (Array.isArray(byPhone)) {
          for (const p of byPhone) results.push(this.normalizePerson(p));
        }
      } catch {
        // Phone search may 404
      }
    }

    if (query.firstName && query.lastName && results.length === 0) {
      const filter = `FirstName eq '${this.escapeOData(query.firstName)}' and LastName eq '${this.escapeOData(query.lastName)}'`;
      const byName = await this.get(
        `/api/People?$filter=${encodeURIComponent(filter)}&loadAttributes=simple&$expand=PhoneNumbers&$top=10`
      );
      if (Array.isArray(byName)) {
        for (const p of byName) results.push(this.normalizePerson(p));
      }
    }

    return results;
  }

  // ===========================================================================
  // READ: Families
  // ===========================================================================

  async listFamilies(externalPersonIds: string[]): Promise<NormalizedFamily[]> {
    const familyMap = new Map<number, NormalizedFamily>();

    for (const personId of externalPersonIds) {
      try {
        const families = await this.get(
          `/api/Groups/GetFamilies/${personId}?$expand=Members`
        );

        if (!Array.isArray(families)) continue;

        for (const family of families) {
          if (familyMap.has(family.Id)) continue;

          const members: NormalizedFamilyMember[] = [];
          if (Array.isArray(family.Members)) {
            for (const m of family.Members) {
              members.push({
                externalPersonId: String(m.PersonId),
                role: this.mapFamilyRole(m.GroupRoleId),
                firstName: m.Person?.NickName || m.Person?.FirstName || "",
                lastName: m.Person?.LastName || "",
              });
            }
          }

          familyMap.set(family.Id, {
            externalId: String(family.Id),
            name: family.Name || "Family",
            members,
          });
        }
      } catch {
        // Skip families that error — person may not have a family group
      }
    }

    return Array.from(familyMap.values());
  }

  // ===========================================================================
  // READ: Groups
  // ===========================================================================

  async listGroups(groupTypeIds?: string[]): Promise<NormalizedGroup[]> {
    const allGroups: NormalizedGroup[] = [];
    let skip = 0;
    let hasMore = true;

    // Filter to specific group types if configured
    const typeFilter = groupTypeIds?.length
      ? ` and (${groupTypeIds.map((id) => `GroupTypeId eq ${id}`).join(" or ")})`
      : "";

    // Exclude family groups (GroupTypeId=10)
    const baseFilter = `IsActive eq true and GroupTypeId ne ${DEFAULT_FAMILY_GROUP_TYPE_ID}${typeFilter}`;

    while (hasMore) {
      const url = `/api/Groups?$filter=${encodeURIComponent(baseFilter)}&$expand=Members&$top=${PAGE_SIZE}&$skip=${skip}&$orderby=Id`;
      const page = await this.get(url);

      if (!Array.isArray(page) || page.length === 0) {
        hasMore = false;
        break;
      }

      for (const group of page) {
        const members: NormalizedGroupMember[] = [];
        if (Array.isArray(group.Members)) {
          for (const m of group.Members) {
            members.push({
              externalPersonId: String(m.PersonId),
              role: m.GroupRole?.IsLeader ? "leader" : "member",
            });
          }
        }

        allGroups.push({
          externalId: String(group.Id),
          name: group.Name || "",
          description: group.Description || undefined,
          groupType: group.GroupType?.Name || undefined,
          campus: group.CampusId
            ? { id: String(group.CampusId), name: group.Campus?.Name || "" }
            : undefined,
          members,
        });
      }

      skip += PAGE_SIZE;
      hasMore = page.length === PAGE_SIZE;
    }

    return allGroups;
  }

  // ===========================================================================
  // WRITE: Create Person
  // ===========================================================================

  async createPerson(
    person: NormalizedPerson
  ): Promise<{ externalId: string }> {
    const body: Record<string, unknown> = {
      FirstName: person.firstName,
      LastName: person.lastName,
      NickName: person.nickname || person.firstName,
      Email: person.email || undefined,
      Gender: person.gender === "male" ? 1 : person.gender === "female" ? 2 : 0,
      IsSystem: false,
      RecordTypeValueId: 1, // Person (not Business)
      RecordStatusValueId: 5, // Active
      ConnectionStatusValueId: 146, // Visitor (safe default)
    };

    if (person.birthDate) {
      body.BirthDate = person.birthDate;
    }

    const result = await this.post("/api/People", body);

    // Rock POST returns the new ID as a plain number
    const newId = typeof result === "number" ? result : (result as Record<string, unknown>)?.Id;
    if (!newId) {
      throw new Error("Rock: Failed to create person — no ID returned");
    }

    // Add phone number if provided
    if (person.phone) {
      try {
        await this.post("/api/PhoneNumbers", {
          PersonId: newId,
          Number: person.phone.replace(/[^0-9]/g, ""),
          NumberTypeValueId: 12, // Mobile
          IsMessagingEnabled: true,
        });
      } catch {
        // Non-critical: person created but phone failed
      }
    }

    return { externalId: String(newId) };
  }

  // ===========================================================================
  // WRITE: Update Person
  // ===========================================================================

  async updatePerson(
    externalId: string,
    updates: Partial<NormalizedPerson>
  ): Promise<void> {
    const body: Record<string, unknown> = {};

    if (updates.firstName) body.FirstName = updates.firstName;
    if (updates.lastName) body.LastName = updates.lastName;
    if (updates.nickname) body.NickName = updates.nickname;
    if (updates.email) body.Email = updates.email;
    if (updates.birthDate) body.BirthDate = updates.birthDate;
    if (updates.gender !== undefined) {
      body.Gender =
        updates.gender === "male" ? 1 : updates.gender === "female" ? 2 : 0;
    }

    if (Object.keys(body).length > 0) {
      await this.patch(`/api/People/${externalId}`, body);
    }
  }

  // ===========================================================================
  // WRITE: Activity Write-Back
  // ===========================================================================

  async writeActivity(
    activities: ActivityWriteBack[]
  ): Promise<{ succeeded: number; failed: number }> {
    let succeeded = 0;
    let failed = 0;

    for (const activity of activities) {
      try {
        // Write custom attributes (SheepDoggo fields on Rock Person)
        const attributeKey =
          this.syncConfig.rockPersonAttributeKey || "SheepDoggo";
        const personId = activity.externalPersonId;

        if (activity.lastCheckIn) {
          await this.setPersonAttribute(
            personId,
            `${attributeKey}LastCheckIn`,
            activity.lastCheckIn
          );
        }
        if (activity.lastText) {
          await this.setPersonAttribute(
            personId,
            `${attributeKey}LastText`,
            activity.lastText
          );
        }
        if (activity.belongingStatus) {
          await this.setPersonAttribute(
            personId,
            `${attributeKey}Belonging`,
            activity.belongingStatus
          );
        }
        if (activity.totalPoints !== undefined) {
          await this.setPersonAttribute(
            personId,
            `${attributeKey}Points`,
            String(activity.totalPoints)
          );
        }
        if (activity.totalCheckIns !== undefined) {
          await this.setPersonAttribute(
            personId,
            `${attributeKey}CheckIns`,
            String(activity.totalCheckIns)
          );
        }

        // Write Interaction if provided (Rock-specific detailed activity log)
        if (activity.interaction) {
          await this.writeInteraction(personId, activity.interaction);
        }

        succeeded++;
      } catch {
        failed++;
      }
    }

    return { succeeded, failed };
  }

  // ===========================================================================
  // PRIVATE: HTTP Methods
  // ===========================================================================

  private async get(path: string): Promise<unknown> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, { headers: this.headers });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Rock API GET ${path} failed (${res.status}): ${text}`);
    }

    return res.json();
  }

  private async post(
    path: string,
    body: Record<string, unknown>
  ): Promise<unknown> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Rock API POST ${path} failed (${res.status}): ${text}`);
    }

    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return res.json();
    }
    // Rock sometimes returns plain text (e.g., new ID as a number)
    const text = await res.text();
    const num = Number(text);
    return isNaN(num) ? text : num;
  }

  private async patch(
    path: string,
    body: Record<string, unknown>
  ): Promise<void> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Rock API PATCH ${path} failed (${res.status}): ${text}`);
    }
  }

  // ===========================================================================
  // PRIVATE: Rock-Specific Operations
  // ===========================================================================

  private async setPersonAttribute(
    personId: string,
    attributeKey: string,
    value: string
  ): Promise<void> {
    // Rock uses POST /api/People/AttributeValue/{personId}
    // with body: { Key: "attributeKey", Value: "value" }
    const url = `${this.baseUrl}/api/People/AttributeValue/${personId}`;
    const res = await fetch(url, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ Key: attributeKey, Value: value }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Rock: Failed to set attribute ${attributeKey} on person ${personId}: ${text}`
      );
    }
  }

  private async writeInteraction(
    personId: string,
    interaction: NonNullable<ActivityWriteBack["interaction"]>
  ): Promise<void> {
    // Rock Interactions API: POST /api/Interactions
    // Requires an InteractionChannelId and InteractionComponentId
    // For simplicity, we use a single "SheepDoggo" channel + component per type
    // These should be created during initial setup and stored in sync_config
    try {
      await this.post("/api/Interactions", {
        PersonAliasId: Number(personId), // May need alias ID
        InteractionDateTime: interaction.date,
        Operation: interaction.componentName,
        InteractionSummary: interaction.summary,
        InteractionData: JSON.stringify({
          source: "sheepdoggo",
          component: interaction.componentName,
        }),
      });
    } catch {
      // Interactions write is best-effort
    }
  }

  // ===========================================================================
  // PRIVATE: Normalization
  // ===========================================================================

  private normalizePerson(raw: Record<string, unknown>): NormalizedPerson {
    // Extract primary phone (Mobile preferred)
    let phone: string | undefined;
    const phoneNumbers = raw.PhoneNumbers as
      | Array<Record<string, unknown>>
      | undefined;
    if (Array.isArray(phoneNumbers)) {
      // Prefer Mobile (NumberTypeValueId=12), fallback to first
      const mobile = phoneNumbers.find(
        (p) => p.NumberTypeValueId === 12 || p.NumberTypeValueId === 136
      );
      const primary = mobile || phoneNumbers[0];
      if (primary?.Number) {
        phone = this.normalizePhone(String(primary.Number));
      }
    }

    // Extract graduation year from attributes if available
    const attributes = raw.AttributeValues as
      | Record<string, Record<string, unknown>>
      | undefined;
    let graduationYear: number | undefined;
    let grade: string | undefined;
    if (attributes?.GraduationYear?.Value) {
      graduationYear = Number(attributes.GraduationYear.Value);
    }
    if (attributes?.Grade?.Value) {
      grade = String(attributes.Grade.Value);
    }

    // Extract campus
    let campus: { id: string; name: string } | undefined;
    if (raw.PrimaryCampusId) {
      campus = {
        id: String(raw.PrimaryCampusId),
        name: (raw.PrimaryCampus as Record<string, unknown>)?.Name
          ? String((raw.PrimaryCampus as Record<string, unknown>).Name)
          : "",
      };
    }

    return {
      externalId: String(raw.Id),
      externalAliasId: raw.PrimaryAliasId
        ? String(raw.PrimaryAliasId)
        : undefined,
      externalGuid: raw.Guid ? String(raw.Guid) : undefined,
      firstName: String(raw.FirstName || ""),
      lastName: String(raw.LastName || ""),
      nickname:
        raw.NickName && raw.NickName !== raw.FirstName
          ? String(raw.NickName)
          : undefined,
      email: raw.Email ? String(raw.Email) : undefined,
      phone,
      gender:
        raw.Gender === 1 ? "male" : raw.Gender === 2 ? "female" : undefined,
      birthDate: raw.BirthDate
        ? String(raw.BirthDate).split("T")[0]
        : undefined,
      grade,
      graduationYear,
      campus,
      // Family info requires separate API call (GetFamilies)
      customFields: this.extractCustomFields(attributes),
      externalCreatedAt: raw.CreatedDateTime
        ? String(raw.CreatedDateTime)
        : undefined,
      externalUpdatedAt: raw.ModifiedDateTime
        ? String(raw.ModifiedDateTime)
        : undefined,
    };
  }

  private extractCustomFields(
    attributes:
      | Record<string, Record<string, unknown>>
      | undefined
  ): Record<string, string> | undefined {
    if (!attributes) return undefined;

    const fields: Record<string, string> = {};
    for (const [key, attr] of Object.entries(attributes)) {
      if (attr.Value !== null && attr.Value !== undefined && attr.Value !== "") {
        fields[key] = String(attr.Value);
      }
    }

    return Object.keys(fields).length > 0 ? fields : undefined;
  }

  private mapFamilyRole(
    groupRoleId: number
  ): "head" | "spouse" | "child" | "other" {
    // Rock family roles: Adult (3) or Child (4) by default
    // We map Adult → head (first) or spouse (subsequent), Child → child
    if (groupRoleId === CHILD_ROLE_ID) return "child";
    if (groupRoleId === ADULT_ROLE_ID) return "head"; // Simplified; would need ordering for head vs spouse
    return "other";
  }

  private normalizePhone(phone: string): string {
    const digits = phone.replace(/[^0-9]/g, "");
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
    return `+${digits}`;
  }

  private escapeOData(value: string): string {
    return value.replace(/'/g, "''");
  }
}
