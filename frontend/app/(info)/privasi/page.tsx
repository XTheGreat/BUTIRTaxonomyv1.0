import type { Metadata } from "next";
import { metadataPublik } from "@/lib/seo";
import PrivasiIsi from "./PrivasiIsi";

export const metadata: Metadata = metadataPublik({
  title: "Kebijakan Privasi - BUTIR",
  description: "Kebijakan privasi BUTIR: data apa yang dikumpulkan, bagaimana dipakai dan dilindungi, serta hak pengguna.",
  path: "/privasi",
});

export default function PrivasiPage() {
  return <PrivasiIsi />;
}
