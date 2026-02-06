"use client";

import { useState, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface EngagementState {
  reflected: boolean;
  prayed: boolean;
  journal_entry: string | null;
  prayer_request: string | null;
  opened_at: string | null;
  reflected_at: string | null;
  prayed_at: string | null;
  journaled_at: string | null;
}

export function useDevotionalEngagement(devotionalId: string, isAuthenticated: boolean) {
  const [engagement, setEngagement] = useState<EngagementState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch existing engagement on mount
  useEffect(() => {
    if (!isAuthenticated || !devotionalId) return;

    const fetchEngagement = async () => {
      setIsLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase.rpc("get_my_devotional_engagement", {
          p_devotional_id: devotionalId,
        });
        if (!error && data) {
          const result = data as unknown as { found: boolean; engagement?: EngagementState };
          if (result.found && result.engagement) {
            setEngagement(result.engagement);
          } else {
            setEngagement({
              reflected: false,
              prayed: false,
              journal_entry: null,
              prayer_request: null,
              opened_at: null,
              reflected_at: null,
              prayed_at: null,
              journaled_at: null,
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch engagement:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEngagement();

    // Also record "opened" action
    const recordOpened = async () => {
      try {
        const supabase = createClient();
        await supabase.rpc("record_devotional_engagement", {
          p_devotional_id: devotionalId,
          p_action: "opened",
        });
      } catch {
        // Non-critical
      }
    };
    recordOpened();
  }, [devotionalId, isAuthenticated]);

  const toggleReflected = useCallback(async () => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("record_devotional_engagement", {
        p_devotional_id: devotionalId,
        p_action: "reflected",
      });
      if (!error && data) {
        const result = data as unknown as { success: boolean; engagement?: EngagementState };
        if (result.success && result.engagement) {
          setEngagement(result.engagement);
        }
      }
    } catch (err) {
      console.error("Failed to toggle reflected:", err);
    } finally {
      setIsSaving(false);
    }
  }, [devotionalId]);

  const saveJournal = useCallback(async (text: string) => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("record_devotional_engagement", {
        p_devotional_id: devotionalId,
        p_action: "journaled",
        p_journal_text: text || null,
      });
      if (!error && data) {
        const result = data as unknown as { success: boolean; engagement?: EngagementState };
        if (result.success && result.engagement) {
          setEngagement(result.engagement);
        }
      }
    } catch (err) {
      console.error("Failed to save journal:", err);
    } finally {
      setIsSaving(false);
    }
  }, [devotionalId]);

  const savePrayerRequest = useCallback(async (text: string) => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("record_devotional_engagement", {
        p_devotional_id: devotionalId,
        p_action: "prayed",
        p_journal_text: text || null,
      });
      if (!error && data) {
        const result = data as unknown as { success: boolean; engagement?: EngagementState };
        if (result.success && result.engagement) {
          setEngagement(result.engagement);
        }
      }
    } catch (err) {
      console.error("Failed to save prayer request:", err);
    } finally {
      setIsSaving(false);
    }
  }, [devotionalId]);

  return {
    engagement,
    isLoading,
    isSaving,
    toggleReflected,
    saveJournal,
    savePrayerRequest,
  };
}
