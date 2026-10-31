import type { Metadata } from "next";
import { Suspense } from "react";
import { metadataPublik } from "@/lib/seo";
import LoginForm from "./LoginForm";
import LoginDariUrl from "./LoginDariUrl";

export const metadata: Metadata = metadataPublik({
  title: "Masuk - BUTIR",
  description: "Masuk ke BUTIR sebagai guru atau dosen, atau buka lembar ujian sebagai peserta, untuk menyusun dan mengerjakan butir soal hasil validasi multi-agen AI.",
  path: "/login",
});

// Dibuat statis (tanpa searchParams di server) agar HTML-nya disajikan dari CDN, bukan dirender
// per permintaan. Pilihan peran dari ?sebagai= dibaca di sisi klien oleh LoginDariUrl.
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginForm awal="guru" />}>
      <LoginDariUrl />
    </Suspense>
  );
}
