"use client";

import { useCallback } from "react";
import { usePathname } from "next/navigation";
import { useAmplitude } from "./context";
import { safeTrack } from "./index";
import { EVENTS, EventName } from "./events";
import type { StandardProperties } from "./properties";

/**
 * Get the app version from environment
 */
function getAppVersion(): string {
  return process.env.NEXT_PUBLIC_APP_VERSION || "dev";
}

/**
 * Hook to track Amplitude events with automatic standard properties
 *
 * Standard properties (org_slug, org_id, app_version, page_path, admin_user_id)
 * are automatically merged into every event.
 *
 * @example
 * ```tsx
 * const track = useTrack();
 *
 * // Track with just event name
 * track(EVENTS.DASHBOARD_VIEWED);
 *
 * // Track with additional properties
 * track(EVENTS.CHECK_IN_COMPLETED, {
 *   student_id: '123',
 *   is_duplicate: false,
 *   points_earned: 10,
 * });
 * ```
 */
export function useTrack() {
  const { orgSlug, orgId, adminUserId } = useAmplitude();
  const pathname = usePathname();

  const track = useCallback(
    (event: EventName | string, eventProps: Record<string, unknown> = {}) => {
      // Build standard properties (REQUIRED on every event)
      const standardProps: StandardProperties = {
        org_slug: orgSlug,
        org_id: orgId,
        app_version: getAppVersion(),
        page_path: pathname || "",
        admin_user_id: adminUserId,
      };

      // Merge standard + event-specific properties
      safeTrack(event, {
        ...standardProps,
        ...eventProps,
      });
    },
    [orgSlug, orgId, adminUserId, pathname],
  );

  return track;
}

/**
 * Re-export EVENTS for convenience
 *
 * @example
 * ```tsx
 * import { useTrack, EVENTS } from '@/lib/amplitude/hooks';
 *
 * const track = useTrack();
 * track(EVENTS.CHECK_IN_COMPLETED, { ... });
 * ```
 */
export { EVENTS };

/**
 * Hook to track page views on mount
 *
 * Use this in page components to track when a page is viewed.
 *
 * @example
 * ```tsx
 * // In a page component
 * usePageView(EVENTS.DASHBOARD_VIEWED);
 * ```
 */
export function usePageView(event: EventName) {
  const track = useTrack();

  // Track on mount only
  // Using useEffect would cause double-firing in dev due to strict mode
  // Instead, we'll let the component call track() manually
  return () => track(event);
}

/**
 * Type-safe tracking functions for specific events
 *
 * These provide better TypeScript support for event properties.
 */
export function useCheckInTracking() {
  const track = useTrack();

  return {
    trackPageViewed: (props: {
      checkin_style: "gamified" | "standard" | "minimal";
      device_id?: string;
      device_name?: string;
    }) => track(EVENTS.CHECK_IN_PAGE_VIEWED, props),

    trackStudentSearched: (props: {
      search_term_length: number;
      result_count?: number;
    }) => track(EVENTS.STUDENT_SEARCHED, props),

    trackStudentSelected: (props: {
      student_id: string;
      selection_method: "single" | "from_list";
    }) => track(EVENTS.STUDENT_SELECTED, props),

    trackCheckInConfirmed: (props: { student_id: string }) =>
      track(EVENTS.CHECK_IN_CONFIRMED, props),

    trackCheckInCompleted: (props: {
      student_id: string;
      is_duplicate: boolean;
      points_earned?: number;
      student_grade?: string;
    }) => track(EVENTS.CHECK_IN_COMPLETED, props),

    trackRegistrationStarted: () => track(EVENTS.REGISTRATION_STARTED),

    trackRegistrationCompleted: (props: {
      student_id: string;
      student_grade: string;
      has_email?: boolean;
      has_parent_info?: boolean;
    }) => track(EVENTS.REGISTRATION_COMPLETED, props),

    trackRegistrationAbandoned: (props?: {
      last_section_completed?: "name" | "contact" | "optional";
    }) => track(EVENTS.REGISTRATION_ABANDONED, props || {}),
  };
}

/**
 * Type-safe tracking functions for landing page and marketing events
 *
 * These events fire BEFORE a user has org context (pre-auth).
 */
export function useMarketingTracking() {
  const track = useTrack();

  return {
    trackLandingPageViewed: () => track(EVENTS.LANDING_PAGE_VIEWED),

    trackWaitlistFormSubmitted: (props: {
      ministry_name: string;
      ministry_size: "small" | "medium" | "large" | "mega";
    }) => track(EVENTS.WAITLIST_FORM_SUBMITTED, props),
  };
}

/**
 * Type-safe tracking functions for authentication events
 */
export function useAuthTracking() {
  const track = useTrack();

  return {
    trackAuthPageViewed: (props?: { has_invite_token?: boolean }) =>
      track(EVENTS.AUTH_PAGE_VIEWED, props || {}),

    trackOtpRequested: (props?: { is_invite_flow?: boolean }) =>
      track(EVENTS.OTP_REQUESTED, props || {}),

    trackOtpVerified: (props?: { is_invite_flow?: boolean }) =>
      track(EVENTS.OTP_VERIFIED, props || {}),
  };
}
