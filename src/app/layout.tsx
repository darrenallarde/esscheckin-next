import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Seedling Insights",
  description: "Cultivating care, one connection at a time",
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
