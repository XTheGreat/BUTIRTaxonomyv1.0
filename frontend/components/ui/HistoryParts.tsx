import { HistoryDebatTerakhir } from "@/lib/types";
import { WARNA_GRAFIK } from "@/lib/warnaGrafik";
import { useTeks } from "@/lib/teks";

export const STATUS_HISTORY: { key: string; label: string; warna: string; penanda: string }[] = [
  { key: "diterima", label: "Diterima", warna: "var(--status-diterima)", penanda: WARNA_GRAFIK.diterima },
  { key: "ditandai", label: "Ditandai", warna: "var(--status-ditandai)", penanda: WARNA_GRAFIK.ditandai },
  { key: "ditolak", label: "Ditolak", warna: "var(--status-ditolak)", penanda: WARNA_GRAFIK.ditolak },
  { key: "tertunda", label: "Tertunda", warna: "var(--status-netral)", penanda: WARNA_GRAFIK.tertunda },
];

const MAX_RONDE = 3;
const DURASI_ANIMASI_SEGMENT = 360;

export function warnaStatus(status: string): string {
  return STATUS_HISTORY.find((s) => s.key === status)?.warna ?? "var(--status-netral)";
}

export function warnaPenanda(status: string): string {
  return STATUS_HISTORY.find((s) => s.key === status)?.penanda ?? WARNA_GRAFIK.tertunda;
}

export function Kotak({
  warna,
  kosong = false,
  className = "",
}: {
  warna: string;
  kosong?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block w-2 h-2 shrink-0 border ${className}`}
      style={{
        borderColor: warna,
        backgroundColor: kosong ? "transparent" : warna,
      }}
    />
  );
}

export function PipRonde({ ronde }: { ronde: number }) {
  const t = useTeks().telaah;
  return (
    <span
      className="inline-flex items-center gap-[3px] shrink-0"
      aria-label={t.umum.rondeDari(ronde, MAX_RONDE)}
    >
      {Array.from({ length: MAX_RONDE }).map((_, i) => (
        <span
          key={i}
          className={`w-1.5 h-1.5 rounded-full border ${
            i < ronde
              ? "bg-[var(--accent)] border-[var(--accent)]"
              : "bg-transparent border-[var(--line-strong)]"
          }`}
        />
      ))}
    </span>
  );
}

export function RingkasanStatus({
  hitung,
  total,
  ukuranTeks = "text-[10px]",
}: {
  hitung: HistoryDebatTerakhir["hitung"];
  total: number;
  ukuranTeks?: string;
}) {
  const t = useTeks().telaah;
  const segmenAktif = total > 0
    ? STATUS_HISTORY.flatMap((status) => {
        const jumlah = hitung[status.key] ?? 0;
        return jumlah > 0 ? [{ status, jumlah }] : [];
      })
    : [];

  return (
    <div className="space-y-1.5">
      <div
        className="flex h-1.5 w-full gap-px bg-[var(--line)]"
        role="img"
        aria-label={STATUS_HISTORY.map((s) => `${hitung[s.key] ?? 0} ${t.status[s.key as keyof typeof t.status] ?? s.label}`).join(", ")}
      >
        {segmenAktif.map(({ status, jumlah }, index) => (
          <span
            key={`${status.key}-${jumlah}`}
            style={{
              flexGrow: jumlah,
              backgroundColor: status.penanda,
              animationDelay: `${index * DURASI_ANIMASI_SEGMENT}ms`,
              animationDuration: `${DURASI_ANIMASI_SEGMENT}ms`,
            }}
            className="diagram-animasi diagram-segment-reveal h-full"
          />
        ))}
      </div>
      <ul className={`flex flex-wrap gap-x-3 gap-y-0.5 font-sans ${ukuranTeks}`}>
        {STATUS_HISTORY.map((s) => (
          <li key={s.key} className="inline-flex items-center gap-1 text-[var(--ink-muted)]">
            <Kotak warna={s.penanda} kosong={s.key === "tertunda"} className="!w-1.5 !h-1.5" />
            <span className="tabular-nums font-semibold" style={{ color: s.warna }}>
              {hitung[s.key] ?? 0}
            </span>
            <span>{(t.status[s.key as keyof typeof t.status] ?? s.label).toLowerCase()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
