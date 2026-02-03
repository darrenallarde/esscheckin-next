import type { Metadata } from "next";
import "./globals.css";
import { AmplitudeInit } from "@/lib/amplitude/AmplitudeInit";

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
      </body>
    </html>
  );
}
