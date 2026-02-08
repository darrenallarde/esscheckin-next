import { PublicProviders } from "./providers";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PublicProviders>
      <div className="min-h-screen">{children}</div>
    </PublicProviders>
  );
}
