import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

// Types (until Supabase types are regenerated)
export type DevotionalFrequency = "1x_week" | "3x_week" | "daily";
export type DevotionalTimeSlot = "morning" | "afternoon" | "evening";
export type DevotionalSeriesStatus = "generating" | "ready" | "active" | "archived";

export interface DevotionalSeries {
  id: string;
  organization_id: string;
  sermon_title: string | null;
  sermon_content: string;
  sermon_uploaded_at: string;
  frequency: DevotionalFrequency;
  time_slots: DevotionalTimeSlot[];
  start_date: string;
  status: DevotionalSeriesStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Devotional {
  id: string;
  series_id: string;
  day_number: number;
  scheduled_date: string;
  time_slot: DevotionalTimeSlot;
  title: string;
  scripture_reference: string | null;
  scripture_text: string | null;
  reflection: string;
  prayer_prompt: string | null;
  discussion_question: string | null;
  generated_at: string;
}

// Frequency display labels
export const FREQUENCY_LABELS: Record<DevotionalFrequency, string> = {
  "1x_week": "Once a week",
  "3x_week": "3 times a week",
  daily: "Daily",
};

// Time slot display labels
export const TIME_SLOT_LABELS: Record<DevotionalTimeSlot, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

// Calculate number of days based on frequency (for one week)
export function getDaysForFrequency(frequency: DevotionalFrequency): number {
  switch (frequency) {
    case "1x_week":
      return 1;
    case "3x_week":
      return 3;
    case "daily":
      return 7;
  }
}

// Calculate total devotionals for a series
export function getTotalDevotionals(
  frequency: DevotionalFrequency,
  timeSlots: DevotionalTimeSlot[]
): number {
  return getDaysForFrequency(frequency) * timeSlots.length;
}

// ============================================
// QUERIES
// ============================================

async function fetchDevotionalSeries(
  organizationId: string
): Promise<DevotionalSeries[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("devotional_series")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export function useDevotionalSeries(organizationId: string | null) {
  return useQuery({
    queryKey: ["devotional-series", organizationId],
    queryFn: () => fetchDevotionalSeries(organizationId!),
    enabled: !!organizationId,
  });
}

async function fetchActiveDevotionalSeries(
  organizationId: string
): Promise<DevotionalSeries | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("devotional_series")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export function useActiveDevotionalSeries(organizationId: string | null) {
  return useQuery({
    queryKey: ["devotional-series", organizationId, "active"],
    queryFn: () => fetchActiveDevotionalSeries(organizationId!),
    enabled: !!organizationId,
  });
}

async function fetchDevotionals(seriesId: string): Promise<Devotional[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("devotionals")
    .select("*")
    .eq("series_id", seriesId)
    .order("scheduled_date", { ascending: true })
    .order("time_slot", { ascending: true });

  if (error) throw error;
  return data || [];
}

export function useDevotionals(seriesId: string | null) {
  return useQuery({
    queryKey: ["devotionals", seriesId],
    queryFn: () => fetchDevotionals(seriesId!),
    enabled: !!seriesId,
  });
}

async function fetchDevotional(devotionalId: string): Promise<Devotional | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("devotionals")
    .select("*")
    .eq("id", devotionalId)
    .single();

  if (error) throw error;
  return data;
}

export function useDevotional(devotionalId: string | null) {
  return useQuery({
    queryKey: ["devotional", devotionalId],
    queryFn: () => fetchDevotional(devotionalId!),
    enabled: !!devotionalId,
  });
}

// ============================================
// MUTATIONS
// ============================================

interface CreateSeriesInput {
  organizationId: string;
  sermonTitle?: string;
  sermonContent: string;
  frequency: DevotionalFrequency;
  timeSlots: DevotionalTimeSlot[];
  startDate: string;
}

export function useCreateDevotionalSeries() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (input: CreateSeriesInput) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("devotional_series")
        .insert({
          organization_id: input.organizationId,
          sermon_title: input.sermonTitle || null,
          sermon_content: input.sermonContent,
          frequency: input.frequency,
          time_slots: input.timeSlots,
          start_date: input.startDate,
          status: "generating",
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as DevotionalSeries;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["devotional-series", variables.organizationId],
      });
    },
  });
}

interface UpdateSeriesInput {
  seriesId: string;
  organizationId: string;
  status?: DevotionalSeriesStatus;
  sermonTitle?: string;
}

export function useUpdateDevotionalSeries() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (input: UpdateSeriesInput) => {
      const updates: Partial<DevotionalSeries> = {};
      if (input.status) updates.status = input.status;
      if (input.sermonTitle !== undefined) updates.sermon_title = input.sermonTitle;

      const { data, error } = await supabase
        .from("devotional_series")
        .update(updates)
        .eq("id", input.seriesId)
        .select()
        .single();

      if (error) throw error;
      return data as DevotionalSeries;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["devotional-series", variables.organizationId],
      });
    },
  });
}

export function useActivateDevotionalSeries() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({
      seriesId,
      organizationId,
    }: {
      seriesId: string;
      organizationId: string;
    }) => {
      // First, deactivate any currently active series
      await supabase
        .from("devotional_series")
        .update({ status: "ready" })
        .eq("organization_id", organizationId)
        .eq("status", "active");

      // Then activate the selected series
      const { data, error } = await supabase
        .from("devotional_series")
        .update({ status: "active" })
        .eq("id", seriesId)
        .select()
        .single();

      if (error) throw error;
      return data as DevotionalSeries;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["devotional-series", variables.organizationId],
      });
    },
  });
}

export function useDeleteDevotionalSeries() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({
      seriesId,
      organizationId,
    }: {
      seriesId: string;
      organizationId: string;
    }) => {
      const { error } = await supabase
        .from("devotional_series")
        .delete()
        .eq("id", seriesId);

      if (error) throw error;
      return { organizationId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: ["devotional-series", result.organizationId],
      });
    },
  });
}

interface CreateDevotionalInput {
  seriesId: string;
  dayNumber: number;
  scheduledDate: string;
  timeSlot: DevotionalTimeSlot;
  title: string;
  scriptureReference?: string;
  scriptureText?: string;
  reflection: string;
  prayerPrompt?: string;
  discussionQuestion?: string;
}

export function useCreateDevotional() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (input: CreateDevotionalInput) => {
      const { data, error } = await supabase
        .from("devotionals")
        .insert({
          series_id: input.seriesId,
          day_number: input.dayNumber,
          scheduled_date: input.scheduledDate,
          time_slot: input.timeSlot,
          title: input.title,
          scripture_reference: input.scriptureReference || null,
          scripture_text: input.scriptureText || null,
          reflection: input.reflection,
          prayer_prompt: input.prayerPrompt || null,
          discussion_question: input.discussionQuestion || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Devotional;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["devotionals", variables.seriesId],
      });
    },
  });
}

export function useBulkCreateDevotionals() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({
      seriesId,
      devotionals,
    }: {
      seriesId: string;
      devotionals: Omit<CreateDevotionalInput, "seriesId">[];
    }) => {
      const insertData = devotionals.map((d) => ({
        series_id: seriesId,
        day_number: d.dayNumber,
        scheduled_date: d.scheduledDate,
        time_slot: d.timeSlot,
        title: d.title,
        scripture_reference: d.scriptureReference || null,
        scripture_text: d.scriptureText || null,
        reflection: d.reflection,
        prayer_prompt: d.prayerPrompt || null,
        discussion_question: d.discussionQuestion || null,
      }));

      const { data, error } = await supabase
        .from("devotionals")
        .insert(insertData)
        .select();

      if (error) throw error;
      return data as Devotional[];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["devotionals", variables.seriesId],
      });
    },
  });
}

interface UpdateDevotionalInput {
  devotionalId: string;
  seriesId: string;
  title?: string;
  scriptureReference?: string;
  scriptureText?: string;
  reflection?: string;
  prayerPrompt?: string;
  discussionQuestion?: string;
}

export function useUpdateDevotional() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (input: UpdateDevotionalInput) => {
      const updates: Partial<Devotional> = {};
      if (input.title !== undefined) updates.title = input.title;
      if (input.scriptureReference !== undefined)
        updates.scripture_reference = input.scriptureReference;
      if (input.scriptureText !== undefined)
        updates.scripture_text = input.scriptureText;
      if (input.reflection !== undefined) updates.reflection = input.reflection;
      if (input.prayerPrompt !== undefined)
        updates.prayer_prompt = input.prayerPrompt;
      if (input.discussionQuestion !== undefined)
        updates.discussion_question = input.discussionQuestion;

      const { data, error } = await supabase
        .from("devotionals")
        .update(updates)
        .eq("id", input.devotionalId)
        .select()
        .single();

      if (error) throw error;
      return data as Devotional;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["devotionals", variables.seriesId],
      });
      queryClient.invalidateQueries({
        queryKey: ["devotional", variables.devotionalId],
      });
    },
  });
}
