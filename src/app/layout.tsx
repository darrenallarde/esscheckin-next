import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ESS Check-in",
  description: "Student check-in system for ESS Ministry",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
