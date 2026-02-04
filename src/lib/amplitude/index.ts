"use client";

import * as amplitude from "@amplitude/unified";

let isInitialized = false;
let initPromise: Promise<void> | null = null;
const eventQueue: Array<{ event: string; props: Record<string, unknown> }> = [];

/**
 * Initialize Amplitude SDK
 * Safe to call multiple times - will only init once
 */
export async function initAmplitude(): Promise<void> {
  // Already initialized
  if (isInitialized) return;

  // Init in progress
  if (initPromise) return initPromise;

  const apiKey = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;

  // Log API key status (always, for debugging in production)
  console.log(`[Amplitude] API key ${apiKey ? `found (${apiKey.substring(0, 8)}...)` : "MISSING"}`);

  // Skip if no API key (prevents errors in tests/SSR)
  if (!apiKey) {
    console.warn("[Amplitude] No API key found, skipping initialization. Add NEXT_PUBLIC_AMPLITUDE_API_KEY to Vercel env vars.");
    return;
  }

  console.log("[Amplitude] Initializing SDK...");

  initPromise = amplitude
    .initAll(apiKey, {
      analytics: {
        autocapture: {
          pageViews: true,
          sessions: true,
          elementInteractions: false,
          formInteractions: false,
          fileDownloads: false,
        },
      },
      sessionReplay: {
        sampleRate: 1, // 100% initially, reduce later
      },
    })
    .then(() => {
      isInitialized = true;
      console.log("[Amplitude] SDK initialized successfully");

      // Flush queued events
      if (eventQueue.length > 0) {
        console.log(`[Amplitude] Flushing ${eventQueue.length} queued events`);
        eventQueue.forEach(({ event, props }) => {
          amplitude.track(event, props);
        });
        eventQueue.length = 0;
      }
    })
    .catch((error) => {
      console.error("[Amplitude] Initialization failed:", error);
      initPromise = null; // Allow retry
    });

  return initPromise;
}

/**
 * Check if Amplitude is ready to receive events
 */
export function isAmplitudeReady(): boolean {
  return isInitialized;
}

/**
 * Safe track function that queues events if SDK not ready
 * ALWAYS use this instead of amplitude.track() directly
 */
export function safeTrack(
  event: string,
  props: Record<string, unknown>
): void {
  // Validate required standard properties in development
  if (process.env.NODE_ENV === "development") {
    if (!props.org_slug) {
      console.warn(`[Amplitude] Event "${event}" missing org_slug!`);
    }
    if (!props.org_id) {
      console.warn(`[Amplitude] Event "${event}" missing org_id!`);
    }
  }

  if (isInitialized) {
    console.log(`[Amplitude] Tracking: ${event}`, props);
    amplitude.track(event, props);
  } else {
    // Queue the event
    console.log(`[Amplitude] Queued (SDK not ready): ${event}`);
    eventQueue.push({ event, props });

    // Try to init if not already in progress
    if (!initPromise) {
      initAmplitude();
    }
  }
}

/**
 * Set user ID for Amplitude
 */
export function setAmplitudeUserId(userId: string): void {
  if (!process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY) return;
  amplitude.setUserId(userId);
}

/**
 * Set user properties (identify)
 */
export function setAmplitudeUserProperties(
  properties: Record<string, unknown>
): void {
  if (!process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY) return;

  const identify = new amplitude.Identify();
  Object.entries(properties).forEach(([key, value]) => {
    identify.set(key, value as string | number | boolean);
  });
  amplitude.identify(identify);
}

/**
 * Reset user (on logout)
 */
export function resetAmplitudeUser(): void {
  if (!process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY) return;
  amplitude.reset();
}

// Re-export amplitude for direct access when needed
export { amplitude };
