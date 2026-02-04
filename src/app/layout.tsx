import type { Metadata } from "next";
import "./globals.css";
import { AmplitudeInit } from "@/lib/amplitude/AmplitudeInit";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "Sheepdoggo",
  description: "Helping ministries shepherd their flock",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AmplitudeInit />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
