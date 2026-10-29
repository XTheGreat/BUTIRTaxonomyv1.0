"use client";

import { useBahasa, useTeks, type Bahasa } from "@/lib/teks";
import { ChevronDown } from "lucide-react";

interface PemilihBahasaProps {
  className?: string;
}

export default function PemilihBahasa({ className = "" }: PemilihBahasaProps) {
  const t = useTeks().shell.pemilihBahasa;
  const { bahasa, setBahasa } = useBahasa();

  const pilihan: { kode: Bahasa; nama: string }[] = [
    { kode: "id", nama: "Bahasa Indonesia" },
    { kode: "en", nama: "English" },
    { kode: "zh", nama: "中文" },
  ];

  return (
    <div className={`inline-flex ${className}`}>
      <div className="relative inline-flex">
        <select
          aria-label={t.label}
          value={bahasa}
          onChange={(event) => setBahasa(event.target.value as Bahasa)}
          className="w-40 appearance-none rounded border border-[var(--line-strong)] bg-[var(--canvas)] py-2 pl-3 pr-9 font-sans text-xs text-[var(--ink)] transition-colors duration-[140ms] hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)]"
        >
          {pilihan.map(({ kode, nama }) => (
            <option key={kode} value={kode}>
              {nama}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          size={14}
          strokeWidth={1.75}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]"
        />
      </div>
    </div>
  );
}
