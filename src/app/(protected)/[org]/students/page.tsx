import { redirect } from "next/navigation";

interface StudentsRedirectProps {
  params: Promise<{ org: string }>;
}

export default async function StudentsRedirect({ params }: StudentsRedirectProps) {
  const { org } = await params;
  redirect(`/${org}/people`);
}
