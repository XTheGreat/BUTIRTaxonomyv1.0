"use client";

import katex from "katex";
import "katex/dist/katex.min.css";
import { pecahToken, seimbangkan } from "@/lib/texBertahap";

// Dimuat terpisah (next/dynamic) oleh AlurKerjaAnimasi: KaTeX dan CSS-nya cukup besar dan hanya
// dibutuhkan animasi rumus di layar lebar, jadi tidak boleh ikut memperlambat halaman Masuk di ponsel.

function renderBertahap(token: string[], jumlah: number): string {
  for (let n = jumlah; n > 0 && n > jumlah - 12; n--) {
    try {
      return katex.renderToString(seimbangkan(token.slice(0, n).join("")), { displayMode: true, throwOnError: true });
    } catch {
      continue;
    }
  }
  return "";
}

export default function Rumus({ tex, jumlah }: { tex: string; jumlah: number }) {
  const html = renderBertahap(pecahToken(tex), jumlah);
  return <div className="overflow-hidden [&_.katex-display]:my-0 [&_.katex-display]:overflow-hidden [&_.katex]:text-[1.05em]" dangerouslySetInnerHTML={{ __html: html }} />;
}
