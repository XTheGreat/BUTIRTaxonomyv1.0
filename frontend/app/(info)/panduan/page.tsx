import type { Metadata } from "next";
import { metadataPublik } from "@/lib/seo";
import PanduanIsi from "./PanduanIsi";

export const metadata: Metadata = metadataPublik({
  title: "Panduan Penggunaan - BUTIR",
  description: "Panduan menggunakan BUTIR untuk menyusun kisi-kisi, menghasilkan butir soal, merakit ujian, dan membaca laporan analisis.",
  path: "/panduan",
});

export default function PanduanPage() {
  return <PanduanIsi />;
}
