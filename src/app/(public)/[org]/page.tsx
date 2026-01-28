import { redirect } from "next/navigation";

export default function OrgPage({
  params,
}: {
  params: { org: string };
}) {
  // Redirect to the check-in page
  redirect(`/${params.org}/checkin`);
}
