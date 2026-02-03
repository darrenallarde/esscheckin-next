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
 * This sets the Amplitude user ID to the org ID (hybrid identity approach)
 * and sets persistent user properties.
 *
 * @example
 * ```tsx
 * // On successful auth
 * setOrgContext({
 *   orgId: organization.id,
 *   orgSlug: organization.slug,
 *   role: membership.role,
 * });
 * ```
 */
export function setOrgContext(params: {
  orgId: string;
  orgSlug: string;
  role: "admin" | "leader" | "viewer";
}): void {
  const { orgId, orgSlug, role } = params;

  // Set org ID as the Amplitude user ID (hybrid identity approach)
  setAmplitudeUserId(orgId);

  // Set persistent user properties
  setAmplitudeUserProperties({
    organization_id: orgId,
    organization_slug: orgSlug,
    role,
    is_public_session: false,
    app_version: process.env.NEXT_PUBLIC_APP_VERSION || "dev",
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
