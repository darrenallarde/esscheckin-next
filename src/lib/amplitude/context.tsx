"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { initAmplitude, isAmplitudeReady } from "./index";

interface AmplitudeContextType {
  /** Whether Amplitude SDK is initialized and ready */
  isReady: boolean;
  /** Current organization slug */
  orgSlug: string | null;
  /** Current organization database ID */
  orgId: string | null;
  /** Current authenticated admin user ID (null for public sessions) */
  adminUserId: string | null;
  /** Whether this is a public (unauthenticated) session */
  isPublicSession: boolean;
}

const AmplitudeContext = createContext<AmplitudeContextType>({
  isReady: false,
  orgSlug: null,
  orgId: null,
  adminUserId: null,
  isPublicSession: false,
});

interface AmplitudeProviderProps {
  children: ReactNode;
  /** Organization slug (e.g., "ess-ministry") */
  orgSlug?: string | null;
  /** Organization database ID */
  orgId?: string | null;
  /** Authenticated admin user ID */
  adminUserId?: string | null;
  /** Whether this is a public session (check-in page) */
  isPublicSession?: boolean;
}

/**
 * Amplitude Context Provider
 *
 * Wrap your app (or specific routes) with this provider to enable
 * automatic standard properties on all tracked events.
 *
 * Usage in root layout:
 * ```tsx
 * <AmplitudeProvider orgSlug={orgSlug} orgId={orgId}>
 *   {children}
 * </AmplitudeProvider>
 * ```
 *
 * Usage in public check-in page:
 * ```tsx
 * <AmplitudeProvider orgSlug={orgSlug} orgId={orgId} isPublicSession>
 *   <PublicCheckInForm />
 * </AmplitudeProvider>
 * ```
 */
export function AmplitudeProvider({
  children,
  orgSlug = null,
  orgId = null,
  adminUserId = null,
  isPublicSession = false,
}: AmplitudeProviderProps) {
  const [isReady, setIsReady] = useState(isAmplitudeReady());

  useEffect(() => {
    // Initialize Amplitude if not already
    if (!isReady) {
      initAmplitude().then(() => {
        setIsReady(true);
      });
    }
  }, [isReady]);

  return (
    <AmplitudeContext.Provider
      value={{
        isReady,
        orgSlug,
        orgId,
        adminUserId,
        isPublicSession,
      }}
    >
      {children}
    </AmplitudeContext.Provider>
  );
}

/**
 * Hook to access Amplitude context
 *
 * Returns org context and ready state.
 * Use useTrack() for tracking events.
 */
export function useAmplitude() {
  const context = useContext(AmplitudeContext);
  if (context === undefined) {
    throw new Error("useAmplitude must be used within an AmplitudeProvider");
  }
  return context;
}
