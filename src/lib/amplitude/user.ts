"use client";

import {
  setAmplitudeUserId,
  setAmplitudeUserProperties,
  resetAmplitudeUser,
} from "./index";

/**
 * Set organization context for authenticated users
 *
 * Call this when:
 * - User logs in
 * - User switches organizations
 *
 * This sets the Amplitude user ID to the actual user ID (user-level identity)
 * and sets persistent user properties including admin user info.
 *
 * @example
 * ```tsx
 * // On successful auth
 * setOrgContext({
 *   orgId: organization.id,
 *   orgSlug: organization.slug,
 *   role: membership.role,
 *   userId: user.id,
 *   email: user.email,
 *   displayName: user.user_metadata?.name,
 *   isSuperAdmin: false,
 *   orgCount: orgs.length,
 * });
 * ```
 */
export function setOrgContext(params: {
  orgId: string;
  orgSlug: string;
  role: "admin" | "leader" | "viewer";
  userId: string;
  email: string;
  displayName?: string;
  isSuperAdmin: boolean;
  orgCount?: number;
}): void {
  const { orgId, orgSlug, role, userId, email, displayName, isSuperAdmin, orgCount } = params;

  // Set USER ID as the Amplitude user ID (user-level identity)
  // This allows per-admin analysis and proper session replay identification
  setAmplitudeUserId(userId);

  // Set persistent user properties
  setAmplitudeUserProperties({
    // Org context
    organization_id: orgId,
    organization_slug: orgSlug,
    role,
    is_public_session: false,
    app_version: process.env.NEXT_PUBLIC_APP_VERSION || "dev",
    // User identity (admin users are consenting platform users)
    user_id: userId,
    email,
    display_name: displayName || email.split("@")[0],
    is_super_admin: isSuperAdmin,
    ...(orgCount !== undefined && { org_count: orgCount }),
  });
}

/**
 * Set device context for public check-in sessions
 *
 * Call this when:
 * - Device is set up on public check-in page
 * - Device name is changed
 *
 * This sets the Amplitude user ID to the device ID
 * (each check-in device is a "user" for analytics).
 *
 * @example
 * ```tsx
 * // On device setup
 * setDeviceContext({
 *   deviceId: device.id,
 *   deviceName: device.name,
 *   orgSlug: organization.slug,
 * });
 * ```
 */
export function setDeviceContext(params: {
  deviceId: string;
  deviceName: string;
  orgSlug?: string;
  orgId?: string;
}): void {
  const { deviceId, deviceName, orgSlug, orgId } = params;

  // Set device ID as the Amplitude user ID
  setAmplitudeUserId(deviceId);

  // Set persistent user properties
  setAmplitudeUserProperties({
    device_id: deviceId,
    device_name: deviceName,
    is_public_session: true,
    ...(orgSlug && { organization_slug: orgSlug }),
    ...(orgId && { organization_id: orgId }),
    app_version: process.env.NEXT_PUBLIC_APP_VERSION || "dev",
  });
}

/**
 * Clear user context (on logout)
 *
 * Call this when the user logs out to reset tracking.
 */
export function clearUserContext(): void {
  resetAmplitudeUser();
}

/**
 * Update specific user properties
 *
 * Use this for incremental updates, not full context changes.
 *
 * @example
 * ```tsx
 * // Update just the role
 * updateUserProperties({ role: 'admin' });
 * ```
 */
export function updateUserProperties(
  properties: Record<string, string | number | boolean>
): void {
  setAmplitudeUserProperties(properties);
}
