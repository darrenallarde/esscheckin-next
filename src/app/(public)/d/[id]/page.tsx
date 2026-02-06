import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DevotionalPage } from "./DevotionalPage";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getDevotional(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_devotional", {
    p_devotional_id: id,
  });

  if (error || !data) return null;
  return data as {
    devotional: {
      id: string;
      series_id: string;
      day_number: number;
      scheduled_date: string;
      time_slot: "morning" | "afternoon" | "evening";
      title: string;
      scripture_reference: string | null;
      scripture_text: string | null;
      reflection: string;
      prayer_prompt: string | null;
      discussion_question: string | null;
    };
    series: {
      id: string;
      sermon_title: string | null;
      frequency: string;
      start_date: string;
      status: string;
    };
    organization: {
      id: string;
      name: string;
      display_name: string | null;
      slug: string;
      theme_id: string | null;
    };
    series_devotionals: {
      id: string;
      day_number: number;
      scheduled_date: string;
      time_slot: string;
      title: string;
    }[] | null;
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await getDevotional(id);

  if (!data) {
    return { title: "Devotional Not Found" };
  }

  const orgName = data.organization.display_name || data.organization.name;
  return {
    title: `${data.devotional.title} | ${orgName}`,
    description: data.devotional.reflection.slice(0, 160),
    openGraph: {
      title: data.devotional.title,
      description: data.devotional.reflection.slice(0, 160),
      siteName: orgName,
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  const data = await getDevotional(id);

  if (!data) {
    notFound();
  }

  return (
    <DevotionalPage
      devotional={data.devotional}
      series={data.series}
      organization={data.organization}
      seriesDevotionals={data.series_devotionals}
    />
  );
}
