import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Serif, Public_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const publicSansHeading = Public_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
});

const notoSerif = Noto_Serif({ subsets: ["latin"], variable: "--font-serif" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cloneusly",
  description: "Internal peer recognition and points",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "font-serif",
        notoSerif.variable,
        publicSansHeading.variable,
      )}
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
