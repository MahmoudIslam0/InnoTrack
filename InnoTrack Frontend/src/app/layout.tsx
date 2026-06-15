import { AuthProvider } from "@/contexts/AuthContext";
import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: {
    default: "InnoTrack — Graduate Project Research & AI Recommendation System",
    template: "%s | InnoTrack",
  },
  description:
    "An AI-powered academic platform designed to manage graduation projects, detect research redundancy using semantic similarity, and provide intelligent project recommendations.",
  keywords: [
    "graduation projects",
    "university management system",
    "semantic similarity",
    "Sentence-BERT",
    "RAG recommendation",
    "project submission",
    "academic innovation",
    "InnoTrack",
  ],
  authors: [{ name: "InnoTrack Team" }],

  // الـ Metadata الأساسية للـ Robots والـ Favicon (اختياري ولكن يفضل وجوده)
  metadataBase: new URL(
    "https://79zdyoak4aokhqdx.public.blob.vercel-storage.com/logo-light.png",
  ),

  openGraph: {
    title: "InnoTrack — Graduate Project Research & AI Recommendation",
    description:
      "Prevent project redundancy and streamline academic research. Detect similarity and generate AI-driven project recommendations in one platform.",
    url: "https://79zdyoak4aokhqdx.public.blob.vercel-storage.com/logo-light.png",
    siteName: "InnoTrack",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "InnoTrack Platform Dashboard Preview",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "InnoTrack — Graduate Project Management & AI System",
    description:
      "An AI-powered platform to detect project redundancy and manage university graduation tracks efficiently.",
    images: [
      "https://79zdyoak4aokhqdx.public.blob.vercel-storage.com/logo-light.png",
    ], // نفس الصورة لعرض كارد كبير في تويتر/X
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="min-h-screen bg-background text-foreground font-sans antialiased"
        suppressHydrationWarning
      >
        <NextTopLoader
          color="#3b82f6"
          showSpinner={false}
          height={3}
          shadow="0 0 10px #3b82f6,0 0 5px #3b82f6"
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
