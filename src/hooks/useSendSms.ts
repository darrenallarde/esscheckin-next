import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SendSmsParams {
  to: string;
  body: string;
  studentId?: string;
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

  const sendSms = async ({ to, body, studentId }: SendSmsParams): Promise<SendSmsResult> => {
    setIsSending(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await supabase.functions.invoke('send-sms', {
        body: { to, body, studentId },
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
