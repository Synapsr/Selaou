import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Selaou - Audio Transcription Annotation",
  description:
    "Open source tool for annotating and correcting audio transcriptions for AI training",
  keywords: ["transcription", "annotation", "whisper", "speech-to-text", "AI"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <div className="min-h-screen bg-background">{children}</div>
        <Toaster
          position="bottom-center"
          toastOptions={{
            classNames: {
              toast:
                "rounded-xl border border-slate-200 bg-white text-slate-800 shadow-md",
              success: "border-green-200 bg-green-50 text-green-900",
              error: "border-red-200 bg-red-50 text-red-900",
            },
          }}
        />
      </body>
    </html>
  );
}
