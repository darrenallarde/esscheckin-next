import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { GamePage } from "./GamePage";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface PublicGameData {
  game: {
    id: string;
    organization_id: string;
    devotional_id: string;
    scripture_verses: string;
    historical_facts: { fact: string; source?: string }[];
    fun_facts: { fact: string }[];
    core_question: string;
    status: "generating" | "ready" | "active" | "completed";
    opens_at: string | null;
    closes_at: string | null;
    created_at: string;
  };
  organization: {
    id: string;
    name: string;
    display_name: string | null;
    slug: string;
    theme_id: string | null;
  };
  player_count: number;
}

async function getGame(id: string): Promise<PublicGameData | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_game", {
    p_game_id: id,
  });

  if (error || !data) return null;
  return data as unknown as PublicGameData;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await getGame(id);

  if (!data) {
    return { title: "Game Not Found" };
  }

  const orgName = data.organization.display_name || data.organization.name;
  return {
    title: `Hi-Lo Game | ${orgName}`,
    description: data.game.core_question,
    openGraph: {
      title: `Hi-Lo Game | ${orgName}`,
      description: data.game.core_question,
      siteName: orgName,
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  const data = await getGame(id);

  if (!data) {
    notFound();
  }

  return (
    <GamePage
      game={data.game}
      organization={data.organization}
      playerCount={data.player_count}
    />
  );
}
