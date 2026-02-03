"use client";

import { useEffect } from "react";
import { initAmplitude } from "./index";

/**
 * Amplitude Initializer Component
 *
 * Add this component to your root layout to initialize Amplitude.
 * It's a client component that initializes the SDK on mount.
 *
 * @example
 * ```tsx
 * // In app/layout.tsx
 * import { AmplitudeInit } from "@/lib/amplitude/AmplitudeInit";
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <AmplitudeInit />
 *         {children}
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export function AmplitudeInit() {
  useEffect(() => {
    initAmplitude();
  }, []);

  return null;
}

export default AmplitudeInit;
