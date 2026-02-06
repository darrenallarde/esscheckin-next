/**
 * SMS segment calculation helper.
 * Twilio auto-segments long messages:
 * - GSM-7 encoding: 160 chars for single, 153 per segment for multi-part
 * - Unicode (emoji/special chars): 70 chars for single, 67 per segment for multi-part
 * - Max 1,600 characters per API call (Twilio hard limit, Error 21617)
 */

export const SMS_MAX_LENGTH = 1600;
export const SMS_SINGLE_SEGMENT = 160;

export function countSmsSegments(text: string): number {
  if (!text) return 0;
  const hasUnicode = /[^\x00-\x7F]/.test(text);
  if (text.length <= (hasUnicode ? 70 : 160)) return 1;
  const limit = hasUnicode ? 67 : 153;
  return Math.ceil(text.length / limit);
}

/**
 * Returns display text for the SMS character counter.
 * - Under 160 chars: "142 / 160"
 * - 161–1600 chars: "486 chars · 4 segments"
 * - Over 1600: "1,623 / 1,600 — message too long"
 */
export function smsCounterText(text: string): { text: string; isOverLimit: boolean; isMultiSegment: boolean } {
  const len = text.length;
  if (len <= SMS_SINGLE_SEGMENT) {
    return { text: `${len} / ${SMS_SINGLE_SEGMENT}`, isOverLimit: false, isMultiSegment: false };
  }
  if (len <= SMS_MAX_LENGTH) {
    const segments = countSmsSegments(text);
    return {
      text: `${len.toLocaleString()} chars · ${segments} segment${segments === 1 ? "" : "s"}`,
      isOverLimit: false,
      isMultiSegment: true,
    };
  }
  return {
    text: `${len.toLocaleString()} / ${SMS_MAX_LENGTH.toLocaleString()} — message too long`,
    isOverLimit: true,
    isMultiSegment: true,
  };
}
