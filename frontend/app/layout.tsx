import "./globals.css";
import { Metadata } from "next";
import Script from "next/script";
import KursorLingkaran from "@/components/ui/KursorLingkaran";
import PenerapTampilan from "@/components/pengaturan/PenerapTampilan";
import { BahasaProvider } from "@/lib/teks";
import { URL_SITUS } from "@/lib/seo";

// Font aplikasi adalah Times New Roman (lihat app/globals.css). Instrument Sans dan JetBrains Mono
// dulu dimuat di sini tetapi tidak dipakai di mana pun, jadi dihapus agar tidak ikut diunduh.
export const metadata: Metadata = {
  metadataBase: new URL(URL_SITUS),
  title: "BUTIR - Sistem Validasi Butir Soal",
  description: "Sistem penyusunan dan validasi butir soal ujian via debat multi-agen AI",
  robots: { index: false, follow: false, nocache: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const temaTersimpan = `try{var t=JSON.parse(localStorage.getItem("butir_tampilan")||"null")?.tema;document.documentElement.dataset.tema=t==="gelap"?"gelap":"terang"}catch{document.documentElement.dataset.tema="terang"}`;

  return (
    <html lang="id" suppressHydrationWarning>
      <body className="bg-canvas text-ink font-sans antialiased min-h-screen">
        <Script id="terapkan-tema-awal" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: temaTersimpan }} />
        <BahasaProvider>
          {children}
          <KursorLingkaran />
          <PenerapTampilan />
        </BahasaProvider>
      </body>
    </html>
  );
}
