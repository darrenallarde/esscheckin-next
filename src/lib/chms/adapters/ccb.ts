/**
 * CCB (Church Community Builder / Pushpay) Adapter
 *
 * Implements ChmsProviderAdapter for CCB.
 *
 * Key CCB concepts:
 * - XML API (all responses are XML, not JSON)
 * - Auth: Basic Auth with API username/password
 * - URL pattern: https://{subdomain}.ccbchurch.com/api.php?srv={service_name}
 * - Rate limit: 10,000 requests per day (SEVERE — must batch aggressively)
 * - Custom fields: udf_text_1 through udf_text_12 (only 12 text slots!)
 * - Family positions: h (head), s (spouse), c (child), o (other)
 * - sync_id and other_id fields for external ID storage
 * - No webhooks — polling only
 * - modified_since parameter for incremental sync
 *
 * Rate limit strategy for a church with 500 students:
 * - Import: ~500/25 per page = 20 calls + family lookups ~520 calls (one-time)
 * - Write-back: ~50 active/day x 1 call = ~50/day
 * - Incremental poll: 1 call every 6 hours = 4/day
 * - Total daily: ~54 calls (well within 10,000 limit)
 */

import type {
  ChmsConnectionWithCredentials,
  CcbCredentials,
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

const PAGE_SIZE = 25; // CCB default page size

export class CcbAdapter implements ChmsProviderAdapter {
  readonly provider = "ccb" as const;

  private baseUrl: string;
  private username: string;
  private password: string;
  private syncConfig: SyncConfig;
  private authHeader: string = "";

  constructor(connection: ChmsConnectionWithCredentials) {
    if (!connection.base_url) {
      throw new Error("CCB requires a church URL (e.g., mychurch.ccbchurch.com)");
    }
    const creds = connection.credentials as CcbCredentials;
    if (!creds.username || !creds.password) {
      throw new Error("CCB requires an API username and password");
    }

    // Normalize URL
    let url = connection.base_url.replace(/\/+$/, "");
    if (!url.startsWith("http")) {
      url = `https://${url}`;
    }
    this.baseUrl = url;
    this.username = creds.username;
    this.password = creds.password;
    this.syncConfig = connection.sync_config || {};
  }

  async authenticate(): Promise<void> {
    this.authHeader = "Basic " + btoa(`${this.username}:${this.password}`);

    // Test with a lightweight call
    const xml = await this.callService("api_status");
    if (!xml.includes("<response")) {
      throw new Error("CCB authentication failed: unexpected response");
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
      canWriteInteractions: false,
      canWriteCustomFields: true,
      customFieldSlots: 12, // udf_text_1 through udf_text_12
      hasWebhooks: false,
      hasIncrementalSync: true,
      maxPageSize: PAGE_SIZE,
      rateLimit: { perDay: 10000 },
    };
  }

  // ===========================================================================
  // READ: People
  // ===========================================================================

  async listPeople(modifiedSince?: string): Promise<NormalizedPerson[]> {
    const allPeople: NormalizedPerson[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      let params = `&page=${page}&per_page=${PAGE_SIZE}`;
      if (modifiedSince) {
        params += `&modified_since=${modifiedSince}`;
      }

      const xml = await this.callService(
        `individual_profiles${params}`
      );
      const people = this.parseIndividuals(xml);

      allPeople.push(...people);

      hasMore = people.length === PAGE_SIZE;
      page++;
    }

    return allPeople;
  }

  async searchPerson(query: {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<NormalizedPerson[]> {
    let params = "";
    if (query.firstName) params += `&first_name=${encodeURIComponent(query.firstName)}`;
    if (query.lastName) params += `&last_name=${encodeURIComponent(query.lastName)}`;
    if (query.email) params += `&email=${encodeURIComponent(query.email)}`;
    if (query.phone) params += `&phone=${encodeURIComponent(query.phone)}`;

    const xml = await this.callService(`individual_search${params}`);
    return this.parseIndividuals(xml);
  }

  // ===========================================================================
  // READ: Families
  // ===========================================================================

  async listFamilies(externalPersonIds: string[]): Promise<NormalizedFamily[]> {
    const familyMap = new Map<string, NormalizedFamily>();

    for (const personId of externalPersonIds) {
      try {
        const xml = await this.callService(
          `family_detail&individual_id=${personId}`
        );
        const family = this.parseFamily(xml);
        if (family && !familyMap.has(family.externalId)) {
          familyMap.set(family.externalId, family);
        }
      } catch {
        // Person may not have a family
      }
    }

    return Array.from(familyMap.values());
  }

  // ===========================================================================
  // READ: Groups
  // ===========================================================================

  async listGroups(groupTypeIds?: string[]): Promise<NormalizedGroup[]> {
    const allGroups: NormalizedGroup[] = [];

    // Fetch group list
    const xml = await this.callService("group_profiles");
    const groups = this.parseGroups(xml);

    // Filter by group IDs if configured
    const targetIds = groupTypeIds || this.syncConfig.ccbGroupIds?.map(String);

    for (const group of groups) {
      if (targetIds && !targetIds.includes(group.externalId)) continue;

      // Fetch group participants
      try {
        const participantsXml = await this.callService(
          `group_participants&id=${group.externalId}`
        );
        group.members = this.parseGroupMembers(participantsXml);
      } catch {
        // Group may not have participants endpoint accessible
      }

      allGroups.push(group);
    }

    return allGroups;
  }

  // ===========================================================================
  // WRITE: Create Person
  // ===========================================================================

  async createPerson(
    person: NormalizedPerson
  ): Promise<{ externalId: string }> {
    let params = "";
    params += `&first_name=${encodeURIComponent(person.firstName)}`;
    params += `&last_name=${encodeURIComponent(person.lastName)}`;
    if (person.email) params += `&email=${encodeURIComponent(person.email)}`;
    if (person.phone)
      params += `&mobile_phone=${encodeURIComponent(person.phone)}`;
    if (person.gender)
      params += `&gender=${person.gender === "male" ? "M" : "F"}`;
    if (person.birthDate)
      params += `&birthday=${encodeURIComponent(person.birthDate)}`;

    const xml = await this.callService(`create_individual${params}`);
    const idMatch = xml.match(/<individual[^>]*id="(\d+)"/);

    if (!idMatch) {
      throw new Error("CCB: Failed to create person — no ID in response");
    }

    return { externalId: idMatch[1] };
  }

  // ===========================================================================
  // WRITE: Update Person
  // ===========================================================================

  async updatePerson(
    externalId: string,
    updates: Partial<NormalizedPerson>
  ): Promise<void> {
    let params = `&individual_id=${externalId}`;

    if (updates.firstName)
      params += `&first_name=${encodeURIComponent(updates.firstName)}`;
    if (updates.lastName)
      params += `&last_name=${encodeURIComponent(updates.lastName)}`;
    if (updates.email)
      params += `&email=${encodeURIComponent(updates.email)}`;
    if (updates.phone)
      params += `&mobile_phone=${encodeURIComponent(updates.phone)}`;

    await this.callService(`update_individual${params}`);
  }

  // ===========================================================================
  // WRITE: Activity Write-Back
  // ===========================================================================

  async writeActivity(
    activities: ActivityWriteBack[]
  ): Promise<{ succeeded: number; failed: number }> {
    let succeeded = 0;
    let failed = 0;

    // CCB custom field mapping (udf_text_1 through udf_text_6):
    // udf_text_1 = LastCheckIn
    // udf_text_2 = LastText
    // udf_text_3 = Belonging
    // udf_text_4 = Points
    // udf_text_5 = CheckIns
    // udf_text_6 = SheepDoggoId (for reverse linking)
    for (const activity of activities) {
      try {
        let params = `&individual_id=${activity.externalPersonId}`;

        if (activity.lastCheckIn) {
          params += `&udf_text_1=${encodeURIComponent(activity.lastCheckIn)}`;
        }
        if (activity.lastText) {
          params += `&udf_text_2=${encodeURIComponent(activity.lastText)}`;
        }
        if (activity.belongingStatus) {
          params += `&udf_text_3=${encodeURIComponent(activity.belongingStatus)}`;
        }
        if (activity.totalPoints !== undefined) {
          params += `&udf_text_4=${encodeURIComponent(String(activity.totalPoints))}`;
        }
        if (activity.totalCheckIns !== undefined) {
          params += `&udf_text_5=${encodeURIComponent(String(activity.totalCheckIns))}`;
        }

        await this.callService(`update_individual${params}`);
        succeeded++;
      } catch {
        failed++;
      }
    }

    return { succeeded, failed };
  }

  // ===========================================================================
  // PRIVATE: HTTP
  // ===========================================================================

  private async callService(service: string): Promise<string> {
    // CCB API uses query params on a single endpoint
    const url = `${this.baseUrl}/api.php?srv=${service}`;
    const res = await fetch(url, {
      headers: {
        Authorization: this.authHeader,
        Accept: "text/xml",
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `CCB API ${service} failed (${res.status}): ${text.substring(0, 200)}`
      );
    }

    return res.text();
  }

  // ===========================================================================
  // PRIVATE: XML Parsing
  // ===========================================================================

  /**
   * Parse CCB individual profiles XML into NormalizedPerson[].
   * CCB returns XML like:
   * <individuals>
   *   <individual id="123">
   *     <first_name>John</first_name>
   *     <last_name>Smith</last_name>
   *     <email>john@example.com</email>
   *     <phones><phone type="mobile">555-1234</phone></phones>
   *     ...
   *   </individual>
   * </individuals>
   *
   * We use regex-based parsing since Deno edge functions don't have DOMParser
   * for server-side XML, and pulling in a full XML library is overkill for
   * the well-structured CCB responses.
   */
  private parseIndividuals(xml: string): NormalizedPerson[] {
    const people: NormalizedPerson[] = [];

    // Match each <individual> block
    const individualBlocks = xml.match(
      /<individual[^>]*>[\s\S]*?<\/individual>/g
    );
    if (!individualBlocks) return people;

    for (const block of individualBlocks) {
      const id = this.xmlAttr(block, "individual", "id");
      if (!id) continue;

      const firstName = this.xmlText(block, "first_name");
      const lastName = this.xmlText(block, "last_name");
      if (!firstName && !lastName) continue;

      // Extract mobile phone
      const mobileMatch = block.match(
        /<phone[^>]*type="mobile"[^>]*>(.*?)<\/phone>/
      );
      const phone = mobileMatch
        ? this.normalizePhone(mobileMatch[1])
        : undefined;

      // Extract address
      const addresses: NormalizedAddress[] = [];
      const street = this.xmlText(block, "street_address");
      if (street) {
        addresses.push({
          street1: street,
          city: this.xmlText(block, "city") || "",
          state: this.xmlText(block, "state") || "",
          postalCode: this.xmlText(block, "zip") || "",
        });
      }

      // Family info
      const familyId = this.xmlText(block, "family_id");
      const familyPosition = this.xmlText(block, "family_position");

      people.push({
        externalId: id,
        firstName: firstName || "",
        lastName: lastName || "",
        email: this.xmlText(block, "email") || undefined,
        phone,
        gender:
          this.xmlText(block, "gender") === "M"
            ? "male"
            : this.xmlText(block, "gender") === "F"
              ? "female"
              : undefined,
        birthDate: this.xmlText(block, "birthday") || undefined,
        grade: this.xmlText(block, "grade") || undefined,
        graduationYear: this.xmlText(block, "graduation_year")
          ? Number(this.xmlText(block, "graduation_year"))
          : undefined,
        familyId: familyId || undefined,
        familyRole:
          familyPosition === "c"
            ? "child"
            : familyPosition
              ? "adult"
              : undefined,
        addresses: addresses.length > 0 ? addresses : undefined,
        externalUpdatedAt:
          this.xmlText(block, "modified_date") || undefined,
      });
    }

    return people;
  }

  private parseFamily(xml: string): NormalizedFamily | null {
    const familyId = this.xmlAttr(xml, "family", "id");
    if (!familyId) return null;

    const members: NormalizedFamilyMember[] = [];
    const memberBlocks = xml.match(
      /<individual[^>]*>[\s\S]*?<\/individual>/g
    );

    if (memberBlocks) {
      for (const block of memberBlocks) {
        const id = this.xmlAttr(block, "individual", "id");
        const position = this.xmlText(block, "family_position") || "o";

        members.push({
          externalPersonId: id || "",
          role: this.mapCcbFamilyPosition(position),
          firstName: this.xmlText(block, "first_name") || "",
          lastName: this.xmlText(block, "last_name") || "",
        });
      }
    }

    return {
      externalId: familyId,
      name:
        this.xmlText(xml, "family_name") ||
        (members[0]?.lastName ? `${members[0].lastName} Family` : "Family"),
      members,
    };
  }

  private parseGroups(xml: string): NormalizedGroup[] {
    const groups: NormalizedGroup[] = [];
    const groupBlocks = xml.match(/<group[^>]*>[\s\S]*?<\/group>/g);
    if (!groupBlocks) return groups;

    for (const block of groupBlocks) {
      const id = this.xmlAttr(block, "group", "id");
      if (!id) continue;

      groups.push({
        externalId: id,
        name: this.xmlText(block, "name") || "",
        description: this.xmlText(block, "description") || undefined,
        groupType: this.xmlText(block, "group_type") || undefined,
        members: [], // Populated separately via group_participants
      });
    }

    return groups;
  }

  private parseGroupMembers(xml: string): NormalizedGroupMember[] {
    const members: NormalizedGroupMember[] = [];
    const participantBlocks = xml.match(
      /<participant[^>]*>[\s\S]*?<\/participant>/g
    );
    if (!participantBlocks) return members;

    for (const block of participantBlocks) {
      const id = this.xmlAttr(block, "participant", "id");
      const isLeader =
        this.xmlText(block, "group_leader") === "true" ||
        this.xmlText(block, "leader") === "true";

      if (id) {
        members.push({
          externalPersonId: id,
          role: isLeader ? "leader" : "member",
        });
      }
    }

    return members;
  }

  // ===========================================================================
  // PRIVATE: XML Helpers
  // ===========================================================================

  /** Extract text content from a simple XML element: <tag>text</tag> */
  private xmlText(xml: string, tag: string): string | null {
    const match = xml.match(new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, "s"));
    return match ? match[1].trim() : null;
  }

  /** Extract an attribute value from an XML element: <tag attr="value"> */
  private xmlAttr(
    xml: string,
    tag: string,
    attr: string
  ): string | null {
    const match = xml.match(
      new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`)
    );
    return match ? match[1] : null;
  }

  private mapCcbFamilyPosition(
    position: string
  ): "head" | "spouse" | "child" | "other" {
    switch (position) {
      case "h":
        return "head";
      case "s":
        return "spouse";
      case "c":
        return "child";
      default:
        return "other";
    }
  }

  private normalizePhone(phone: string): string {
    const digits = phone.replace(/[^0-9]/g, "");
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
    return `+${digits}`;
  }
}
