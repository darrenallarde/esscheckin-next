import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PrayerResponsePage } from "./PrayerResponsePage";

interface PageProps {
  params: Promise<{ responseId: string }>;
}

async function getResponseDetail(responseId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_prayer_response_detail", {
    p_response_id: responseId,
  });

  if (error || !data) return null;
  return data as {
    response_id: string;
    response_type: "text" | "voice" | "pray";
    message: string | null;
    voice_url: string | null;
    viewed_at: string | null;
    liked_at: string | null;
    created_at: string;
    responder_name: string;
    prayer_request: string;
    devotional_title: string;
    devotional_id: string;
    prayer_author_profile_id: string;
    prayer_author_user_id: string | null;
    organization_id: string;
    comments: {
      id: string;
      comment_text: string;
      created_at: string;
      author_name: string;
    }[];
  };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { responseId } = await params;
  const data = await getResponseDetail(responseId);

  if (!data) {
    return { title: "Prayer Response" };
  }

  return {
    title: `${data.responder_name} prayed for you`,
    description: "Someone is lifting you up in prayer.",
  };
}

export default async function Page({ params }: PageProps) {
  const { responseId } = await params;
  const data = await getResponseDetail(responseId);

  if (!data) {
    notFound();
  }

  return <PrayerResponsePage responseId={responseId} initialData={data} />;
}
