import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useMyOrgProfile } from '@/hooks/queries/use-my-profile';

interface SendSmsParams {
  to: string;
  body: string;
  studentId?: string;
  profileId?: string; // New: unified profile ID (preferred)
}

interface SendSmsResult {
  success: boolean;
  messageSid?: string;
  status?: string;
  error?: string;
}

export function useSendSms() {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { currentOrganization } = useOrganization();
  const { data: profile } = useMyOrgProfile(currentOrganization?.id || null);
  const supabase = createClient();

  const sendSms = async ({ to, body, studentId, profileId }: SendSmsParams): Promise<SendSmsResult> => {
    setIsSending(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await supabase.functions.invoke('send-sms', {
        body: {
          to,
          body,
          studentId,
          profileId: profileId || studentId, // Use profileId if provided, otherwise studentId
          organizationId: currentOrganization?.id || null,
          senderDisplayName: profile?.display_name || null,
        },
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to send SMS');
      }

      const result = response.data as SendSmsResult;

      if (!result.success) {
        throw new Error(result.error || 'Failed to send SMS');
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send SMS';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsSending(false);
    }
  };

  return { sendSms, isSending, error };
}
