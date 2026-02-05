/**
 * Planning Center Online (PCO) Adapter
 *
 * Implements ChmsProviderAdapter for Planning Center Online.
 *
 * Key PCO concepts:
 * - API follows JSON:API 1.0 spec (data/included/links/meta)
 * - Auth: Personal Access Token (PAT) via Basic Auth, or OAuth2
 * - Centralized API: api.planningcenteronline.com (no custom URLs)
 * - People are in /people/v2/people
 * - Emails and phone numbers are separate sub-resources (include=emails,phone_numbers)
 * - Households replace families (/people/v2/households)
 * - remote_id field on Person is perfect for storing SheepDoggo profile_id
 * - Check-Ins API is READ-ONLY — cannot write attendance
 * - Has native webhooks for People CRUD events
 * - Rate limit: 100 requests per 20 seconds (~300/min)
 * - Pagination via links.next in JSON:API response
 */

import type {
  ChmsConnectionWithCredentials,
  PcoCredentials,
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

const PCO_BASE_URL = "https://api.planningcenteronline.com";
const PAGE_SIZE = 100;

// JSON:API response shapes
interface JsonApiResource {
  id: string;
  type: string;
  attributes: Record<string, unknown>;
  relationships?: Record<
    string,
    { data: { id: string; type: string } | Array<{ id: string; type: string }> }
  >;
}

interface JsonApiResponse {
  data: JsonApiResource | JsonApiResource[];
  included?: JsonApiResource[];
  links?: { self?: string; next?: string; prev?: string };
  meta?: { total_count?: number; count?: number };
}

export class PlanningCenterAdapter implements ChmsProviderAdapter {
  readonly provider = "planning_center" as const;

  private appId: string;
  private secret: string;
  private syncConfig: SyncConfig;
  private authHeader: string = "";

  constructor(connection: ChmsConnectionWithCredentials) {
    const creds = connection.credentials as PcoCredentials;
    if (!creds.app_id || !creds.secret) {
      throw new Error(
        "Planning Center requires an Application ID and Secret"
      );
    }
    this.appId = creds.app_id;
    this.secret = creds.secret;
    this.syncConfig = connection.sync_config || {};
  }

  async authenticate(): Promise<void> {
    this.authHeader = "Basic " + btoa(`${this.appId}:${this.secret}`);

    // Verify credentials with a lightweight request
    const res = await this.getJsonApi(
      "/people/v2/people?per_page=1&fields[person]=first_name"
    );
    if (!res.data) {
      throw new Error("Planning Center authentication failed");
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
      canWriteAttendance: false, // Check-Ins API is READ-ONLY
      canWriteInteractions: false,
      canWriteCustomFields: true,
      customFieldSlots: Infinity,
      hasWebhooks: true,
      hasIncrementalSync: true,
      maxPageSize: PAGE_SIZE,
      rateLimit: { perMinute: 300 },
    };
  }

  // ===========================================================================
  // READ: People
  // ===========================================================================

  async listPeople(modifiedSince?: string): Promise<NormalizedPerson[]> {
    const allPeople: NormalizedPerson[] = [];
    let url = `/people/v2/people?per_page=${PAGE_SIZE}&include=emails,phone_numbers,addresses&order=created_at`;

    if (modifiedSince) {
      url += `&where[updated_at][gte]=${modifiedSince}`;
    }

    let nextUrl: string | null = url;

    while (nextUrl) {
      const res = await this.getJsonApi(nextUrl);
      const people = Array.isArray(res.data) ? res.data : [res.data];
      const included = res.included || [];

      // Build lookup maps for included resources
      const emailMap = new Map<string, string>();
      const phoneMap = new Map<string, string>();
      const addressMap = new Map<string, NormalizedAddress>();

      for (const inc of included) {
        if (inc.type === "Email") {
          // PCO emails have a person relationship
          emailMap.set(inc.id, String(inc.attributes.address || ""));
        } else if (inc.type === "PhoneNumber") {
          phoneMap.set(inc.id, String(inc.attributes.number || ""));
        } else if (inc.type === "Address") {
          addressMap.set(inc.id, {
            street1: String(inc.attributes.street || ""),
            street2: inc.attributes.street_line_2
              ? String(inc.attributes.street_line_2)
              : undefined,
            city: String(inc.attributes.city || ""),
            state: String(inc.attributes.state || ""),
            postalCode: String(inc.attributes.zip || ""),
          });
        }
      }

      for (const person of people) {
        allPeople.push(
          this.normalizePerson(person, emailMap, phoneMap, addressMap, included)
        );
      }

      // JSON:API pagination
      nextUrl = res.links?.next
        ? res.links.next.replace(PCO_BASE_URL, "")
        : null;
    }

    return allPeople;
  }

  async searchPerson(query: {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<NormalizedPerson[]> {
    const searchTerm =
      query.email || query.phone || `${query.firstName} ${query.lastName}`;
    const url = `/people/v2/people?where[search_name_or_email_or_phone_number]=${encodeURIComponent(searchTerm)}&include=emails,phone_numbers&per_page=10`;

    const res = await this.getJsonApi(url);
    const people = Array.isArray(res.data) ? res.data : [res.data];
    const included = res.included || [];

    const emailMap = new Map<string, string>();
    const phoneMap = new Map<string, string>();

    for (const inc of included) {
      if (inc.type === "Email") {
        emailMap.set(inc.id, String(inc.attributes.address || ""));
      } else if (inc.type === "PhoneNumber") {
        phoneMap.set(inc.id, String(inc.attributes.number || ""));
      }
    }

    return people.map((p) =>
      this.normalizePerson(p, emailMap, phoneMap, new Map(), included)
    );
  }

  // ===========================================================================
  // READ: Families (Households)
  // ===========================================================================

  async listFamilies(externalPersonIds: string[]): Promise<NormalizedFamily[]> {
    const householdMap = new Map<string, NormalizedFamily>();

    for (const personId of externalPersonIds) {
      try {
        // Get the person's household
        const res = await this.getJsonApi(
          `/people/v2/people/${personId}/households?include=people`
        );
        const households = Array.isArray(res.data) ? res.data : [res.data];

        for (const household of households) {
          if (!household?.id || householdMap.has(household.id)) continue;

          // Fetch household members
          const membersRes = await this.getJsonApi(
            `/people/v2/households/${household.id}/household_memberships?include=person`
          );
          const memberships = Array.isArray(membersRes.data)
            ? membersRes.data
            : [membersRes.data];
          const includedPeople = membersRes.included || [];

          const members: NormalizedFamilyMember[] = [];
          for (const membership of memberships) {
            if (!membership) continue;
            const personData = includedPeople.find(
              (inc) =>
                inc.type === "Person" &&
                inc.id ===
                  (
                    membership.relationships?.person?.data as {
                      id: string;
                    }
                  )?.id
            );

            const pending = String(
              membership.attributes.person_position || ""
            ).toLowerCase();

            members.push({
              externalPersonId: personData?.id || "",
              role: this.mapHouseholdPosition(pending),
              firstName: String(
                personData?.attributes.first_name || ""
              ),
              lastName: String(personData?.attributes.last_name || ""),
            });
          }

          householdMap.set(household.id, {
            externalId: household.id,
            name: String(household.attributes.name || "Household"),
            members,
          });
        }
      } catch {
        // Skip errors for individual people
      }
    }

    return Array.from(householdMap.values());
  }

  // ===========================================================================
  // READ: Groups
  // ===========================================================================

  async listGroups(groupTypeIds?: string[]): Promise<NormalizedGroup[]> {
    const allGroups: NormalizedGroup[] = [];
    let url = `/groups/v2/groups?per_page=${PAGE_SIZE}&filter=open`;

    if (groupTypeIds?.length) {
      url += `&where[group_type_id]=${groupTypeIds[0]}`;
    }

    let nextUrl: string | null = url;

    while (nextUrl) {
      const res = await this.getJsonApi(nextUrl);
      const groups = Array.isArray(res.data) ? res.data : [res.data];

      for (const group of groups) {
        if (!group) continue;

        // Fetch group memberships
        let members: NormalizedGroupMember[] = [];
        try {
          const membersRes = await this.getJsonApi(
            `/groups/v2/groups/${group.id}/memberships?per_page=${PAGE_SIZE}`
          );
          const memberships = Array.isArray(membersRes.data)
            ? membersRes.data
            : [membersRes.data];

          members = memberships
            .filter((m): m is JsonApiResource => m !== null)
            .map((m) => ({
              externalPersonId: String(
                (m.relationships?.person?.data as { id: string })?.id || ""
              ),
              role: m.attributes.role === "leader" ? ("leader" as const) : ("member" as const),
            }));
        } catch {
          // Group may not have memberships endpoint
        }

        allGroups.push({
          externalId: group.id,
          name: String(group.attributes.name || ""),
          description: group.attributes.description
            ? String(group.attributes.description)
            : undefined,
          groupType: group.attributes.group_type
            ? String(group.attributes.group_type)
            : undefined,
          members,
        });
      }

      nextUrl = res.links?.next
        ? res.links.next.replace(PCO_BASE_URL, "")
        : null;
    }

    return allGroups;
  }

  // ===========================================================================
  // WRITE: Create Person
  // ===========================================================================

  async createPerson(
    person: NormalizedPerson
  ): Promise<{ externalId: string }> {
    const body = {
      data: {
        type: "Person",
        attributes: {
          first_name: person.firstName,
          last_name: person.lastName,
          gender: person.gender === "male" ? "M" : person.gender === "female" ? "F" : undefined,
          birthdate: person.birthDate || undefined,
          remote_id: person.externalId || undefined, // Store SheepDoggo ID
        },
      },
    };

    const res = await this.postJsonApi("/people/v2/people", body);
    const data = res.data as JsonApiResource;

    if (!data?.id) {
      throw new Error("PCO: Failed to create person — no ID returned");
    }

    // Add email
    if (person.email) {
      try {
        await this.postJsonApi(`/people/v2/people/${data.id}/emails`, {
          data: {
            type: "Email",
            attributes: {
              address: person.email,
              location: "Home",
              primary: true,
            },
          },
        });
      } catch {
        // Non-critical
      }
    }

    // Add phone
    if (person.phone) {
      try {
        await this.postJsonApi(`/people/v2/people/${data.id}/phone_numbers`, {
          data: {
            type: "PhoneNumber",
            attributes: {
              number: person.phone,
              location: "Mobile",
              primary: true,
            },
          },
        });
      } catch {
        // Non-critical
      }
    }

    return { externalId: data.id };
  }

  // ===========================================================================
  // WRITE: Update Person
  // ===========================================================================

  async updatePerson(
    externalId: string,
    updates: Partial<NormalizedPerson>
  ): Promise<void> {
    const attributes: Record<string, unknown> = {};

    if (updates.firstName) attributes.first_name = updates.firstName;
    if (updates.lastName) attributes.last_name = updates.lastName;
    if (updates.birthDate) attributes.birthdate = updates.birthDate;
    if (updates.gender !== undefined) {
      attributes.gender =
        updates.gender === "male"
          ? "M"
          : updates.gender === "female"
            ? "F"
            : undefined;
    }

    if (Object.keys(attributes).length > 0) {
      await this.patchJsonApi(`/people/v2/people/${externalId}`, {
        data: { type: "Person", id: externalId, attributes },
      });
    }
  }

  // ===========================================================================
  // WRITE: Activity Write-Back (Custom Field Data)
  // ===========================================================================

  async writeActivity(
    activities: ActivityWriteBack[]
  ): Promise<{ succeeded: number; failed: number }> {
    let succeeded = 0;
    let failed = 0;

    for (const activity of activities) {
      try {
        const personId = activity.externalPersonId;

        // Get or create field definitions for SheepDoggo tab
        // PCO uses field_definitions + field_data per person
        const fields: Array<{ slug: string; value: string }> = [];

        if (activity.lastCheckIn) {
          fields.push({
            slug: "sheepdoggo_last_checkin",
            value: activity.lastCheckIn,
          });
        }
        if (activity.lastText) {
          fields.push({
            slug: "sheepdoggo_last_text",
            value: activity.lastText,
          });
        }
        if (activity.belongingStatus) {
          fields.push({
            slug: "sheepdoggo_belonging",
            value: activity.belongingStatus,
          });
        }
        if (activity.totalPoints !== undefined) {
          fields.push({
            slug: "sheepdoggo_points",
            value: String(activity.totalPoints),
          });
        }
        if (activity.totalCheckIns !== undefined) {
          fields.push({
            slug: "sheepdoggo_checkins",
            value: String(activity.totalCheckIns),
          });
        }

        // Write each field
        for (const field of fields) {
          try {
            // Get existing field_data for this person + field
            const existingRes = await this.getJsonApi(
              `/people/v2/people/${personId}/field_data?where[field_definition_id]=${field.slug}`
            );
            const existing = Array.isArray(existingRes.data)
              ? existingRes.data[0]
              : existingRes.data;

            if (existing?.id) {
              // Update existing
              await this.patchJsonApi(
                `/people/v2/people/${personId}/field_data/${existing.id}`,
                {
                  data: {
                    type: "FieldDatum",
                    id: existing.id,
                    attributes: { value: field.value },
                  },
                }
              );
            } else {
              // Create new
              await this.postJsonApi(
                `/people/v2/people/${personId}/field_data`,
                {
                  data: {
                    type: "FieldDatum",
                    attributes: { value: field.value },
                    relationships: {
                      field_definition: {
                        data: {
                          type: "FieldDefinition",
                          id: field.slug,
                        },
                      },
                    },
                  },
                }
              );
            }
          } catch {
            // Individual field write failure is non-critical
          }
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

  private async getJsonApi(path: string): Promise<JsonApiResponse> {
    const url = path.startsWith("http") ? path : `${PCO_BASE_URL}${path}`;
    const res = await fetch(url, {
      headers: {
        Authorization: this.authHeader,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`PCO API GET failed (${res.status}): ${text}`);
    }

    return res.json();
  }

  private async postJsonApi(
    path: string,
    body: unknown
  ): Promise<JsonApiResponse> {
    const url = `${PCO_BASE_URL}${path}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: this.authHeader,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`PCO API POST failed (${res.status}): ${text}`);
    }

    return res.json();
  }

  private async patchJsonApi(
    path: string,
    body: unknown
  ): Promise<JsonApiResponse> {
    const url = `${PCO_BASE_URL}${path}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: this.authHeader,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`PCO API PATCH failed (${res.status}): ${text}`);
    }

    return res.json();
  }

  // ===========================================================================
  // PRIVATE: Normalization
  // ===========================================================================

  private normalizePerson(
    resource: JsonApiResource,
    emailMap: Map<string, string>,
    phoneMap: Map<string, string>,
    addressMap: Map<string, NormalizedAddress>,
    included: JsonApiResource[]
  ): NormalizedPerson {
    const attrs = resource.attributes;

    // Find email for this person from included resources
    let email: string | undefined;
    const personEmails = included.filter(
      (inc) =>
        inc.type === "Email" &&
        inc.relationships?.person?.data &&
        !Array.isArray(inc.relationships.person.data) &&
        inc.relationships.person.data.id === resource.id
    );
    if (personEmails.length > 0) {
      // Prefer primary email
      const primary =
        personEmails.find((e) => e.attributes.primary) || personEmails[0];
      email = String(primary.attributes.address || "");
    }

    // Find phone for this person
    let phone: string | undefined;
    const personPhones = included.filter(
      (inc) =>
        inc.type === "PhoneNumber" &&
        inc.relationships?.person?.data &&
        !Array.isArray(inc.relationships.person.data) &&
        inc.relationships.person.data.id === resource.id
    );
    if (personPhones.length > 0) {
      const primary =
        personPhones.find((p) => p.attributes.primary) || personPhones[0];
      phone = this.normalizePhone(String(primary.attributes.number || ""));
    }

    // Find addresses
    const personAddresses = included.filter(
      (inc) =>
        inc.type === "Address" &&
        inc.relationships?.person?.data &&
        !Array.isArray(inc.relationships.person.data) &&
        inc.relationships.person.data.id === resource.id
    );
    const addresses: NormalizedAddress[] = personAddresses.map((a) => ({
      street1: String(a.attributes.street || ""),
      street2: a.attributes.street_line_2
        ? String(a.attributes.street_line_2)
        : undefined,
      city: String(a.attributes.city || ""),
      state: String(a.attributes.state || ""),
      postalCode: String(a.attributes.zip || ""),
    }));

    return {
      externalId: resource.id,
      firstName: String(attrs.first_name || ""),
      lastName: String(attrs.last_name || ""),
      nickname:
        attrs.nickname && attrs.nickname !== attrs.first_name
          ? String(attrs.nickname)
          : undefined,
      email,
      phone,
      gender:
        attrs.gender === "M"
          ? "male"
          : attrs.gender === "F"
            ? "female"
            : undefined,
      birthDate: attrs.birthdate ? String(attrs.birthdate) : undefined,
      grade: attrs.grade ? String(attrs.grade) : undefined,
      graduationYear: attrs.graduation_year
        ? Number(attrs.graduation_year)
        : undefined,
      addresses: addresses.length > 0 ? addresses : undefined,
      externalCreatedAt: attrs.created_at
        ? String(attrs.created_at)
        : undefined,
      externalUpdatedAt: attrs.updated_at
        ? String(attrs.updated_at)
        : undefined,
    };
  }

  private mapHouseholdPosition(
    position: string
  ): "head" | "spouse" | "child" | "other" {
    switch (position) {
      case "primary_contact":
        return "head";
      case "spouse":
        return "spouse";
      case "child":
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
