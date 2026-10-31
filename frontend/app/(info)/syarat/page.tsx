import type { Metadata } from "next";
import { metadataPublik } from "@/lib/seo";
import SyaratIsi from "./SyaratIsi";

export const metadata: Metadata = metadataPublik({
  title: "Syarat Penggunaan - BUTIR",
  description: "Syarat dan ketentuan penggunaan layanan BUTIR bagi guru, dosen, dan peserta ujian.",
  path: "/syarat",
});

export default function SyaratPage() {
  return <SyaratIsi />;
}
