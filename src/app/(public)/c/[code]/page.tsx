import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";

interface ShortCodeRedirectProps {
  params: Promise<{ code: string }>;
}

export default async function ShortCodeRedirect({ params }: ShortCodeRedirectProps) {
  const { code } = await params;
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("slug")
    .eq("short_code", code)
    .eq("status", "active")
    .single();

  if (!org) {
    notFound();
  }

  redirect(`/${org.slug}`);
}
