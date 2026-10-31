import type { Metadata } from "next";
import { metadataPublik } from "@/lib/seo";
import TentangIsi from "./TentangIsi";

export const metadata: Metadata = metadataPublik({
  title: "Tentang - BUTIR",
  description: "Tentang BUTIR: sistem penyusunan dan validasi butir soal ujian akademik lewat deliberasi multi-agen AI.",
  path: "/tentang",
});

export default function TentangPage() {
  return <TentangIsi />;
}
