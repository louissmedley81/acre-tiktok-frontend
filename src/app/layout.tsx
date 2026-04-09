import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ACRE",
  description: "Creator dashboard foundation for Google auth, TikTok, and X connections.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
