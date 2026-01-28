/**
 * Security utilities for bot prevention
 *
 * These utilities provide invisible protection against bots without
 * adding friction for legitimate users.
 */

// Minimum time (in ms) required for form submission
export const TIMING_THRESHOLDS = {
  SEARCH_FORM: 1500, // 1.5 seconds for search
  REGISTRATION_FORM: 4000, // 4 seconds for registration
  CHECK_IN_CONFIRM: 800, // 0.8 seconds for confirmation click
};

// Artificial delay to show when suspicious activity detected
export const SILENT_FAIL_DELAY = 3000; // 3 seconds

/**
 * Creates a honeypot field configuration
 * Use this in your form to add an invisible field that bots will fill
 */
export interface HoneypotConfig {
  /** Field name - should look like a real field bots would want to fill */
  name: string;
  /** Current value */
  value: string;
  /** Whether the honeypot was triggered (field was filled) */
  isTriggered: boolean;
}

/**
 * Common honeypot field names that bots often try to fill
 * These look like legitimate fields to automated scripts
 */
export const HONEYPOT_FIELD_NAMES = [
  'website',
  'url',
  'company',
  'fax',
  'phone2',
  'address2',
] as const;

/**
 * Check if a honeypot field was filled (indicating a bot)
 */
export function isHoneypotTriggered(value: string | undefined | null): boolean {
  return value !== undefined && value !== null && value.trim().length > 0;
}

/**
 * Check if form submission is too fast (indicating a bot)
 * @param loadTime - When the form was loaded (Date.now())
 * @param submitTime - When the form was submitted (Date.now())
 * @param threshold - Minimum required time in ms
 */
export function isSubmissionTooFast(
  loadTime: number,
  submitTime: number,
  threshold: number
): boolean {
  const elapsed = submitTime - loadTime;
  return elapsed < threshold;
}

/**
 * Validation result for security checks
 */
export interface SecurityValidation {
  /** Whether the submission passed all security checks */
  isValid: boolean;
  /** Reason for failure (for logging, not user display) */
  failureReason: 'honeypot' | 'timing' | null;
}

/**
 * Validate a form submission for bot activity
 * @param honeypotValue - Value of the honeypot field
 * @param formLoadTime - When the form was loaded
 * @param timingThreshold - Minimum required time
 */
export function validateFormSubmission(
  honeypotValue: string | undefined | null,
  formLoadTime: number,
  timingThreshold: number
): SecurityValidation {
  // Check honeypot first
  if (isHoneypotTriggered(honeypotValue)) {
    return { isValid: false, failureReason: 'honeypot' };
  }

  // Check timing
  if (isSubmissionTooFast(formLoadTime, Date.now(), timingThreshold)) {
    return { isValid: false, failureReason: 'timing' };
  }

  return { isValid: true, failureReason: null };
}

/**
 * Silently handle a security failure
 * Shows a fake "processing" state then returns without taking action
 */
export async function handleSecurityFailure(
  reason: 'honeypot' | 'timing'
): Promise<void> {
  // Log for monitoring (in production, send to analytics)
  console.warn(`[Security] Bot detected: ${reason}`);

  // Artificial delay to simulate processing
  await new Promise((resolve) => setTimeout(resolve, SILENT_FAIL_DELAY));

  // Silent fail - don't throw error, just return
  // The calling code should handle this by not proceeding
}

/**
 * Hook-style helper to track form load time
 * Call this when component mounts to get the load timestamp
 */
export function getFormLoadTime(): number {
  return Date.now();
}

/**
 * CSS styles for hiding honeypot field
 * Applied inline to prevent bots from detecting the pattern in stylesheets
 */
export const honeypotStyles: React.CSSProperties = {
  position: 'absolute',
  left: '-9999px',
  top: '-9999px',
  opacity: 0,
  pointerEvents: 'none',
  height: 0,
  width: 0,
  overflow: 'hidden',
};

/**
 * Honeypot field component props
 */
export interface HoneypotFieldProps {
  value: string;
  onChange: (value: string) => void;
  fieldName?: string;
}

/**
 * Get a random honeypot field name
 * Randomizing makes it harder for bots to learn our patterns
 */
export function getRandomHoneypotName(): string {
  const names = HONEYPOT_FIELD_NAMES;
  return names[Math.floor(Math.random() * names.length)];
}
