"use client";

import { Fragment, useEffect, useState, use } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Laporan, LaporanButir } from "@/lib/types";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import BloomChip from "@/components/ui/BloomChip";
import { ChevronDown, PackageOpen } from "lucide-react";
import MathText from "@/components/ui/MathText";
import { useTeks } from "@/lib/teks";

export default function LaporanPage({
  params,
}: {
  params: Promise<{ ujianId: string }>;
}) {
  const t = useTeks().ujian;
  const resolvedParams = use(params);
  const ujianId = resolvedParams.ujianId;

  const [laporan, setLaporan] = useState<Laporan | null>(null);
  const [loading, setLoading] = useState(true);
  const [terbuka, setTerbuka] = useState<Record<string, boolean>>({});

  useEffect(() => {
    apiFetch(`/api/ujian/${ujianId}/laporan`)
      .then((data) => {
        setLaporan(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ujianId]);

  if (loading) {
    return (
      <div className="border border-[var(--line)] bg-[var(--surface)] p-8 text-center text-xs text-[var(--ink-muted)] font-mono">
        {t.laporan.memuat}
      </div>
    );
  }

  if (!laporan) {
    return (
      <div className="border border-[var(--line)] bg-[var(--surface)] p-8 text-center text-xs text-[var(--ink-muted)] font-mono">
        {t.laporan.belumTersedia}
      </div>
    );
  }

  const dayaBedaAda = laporan.daya_beda_dihitung !== false;

  // Server baru mengirim temuan lengkap (kesukaran, daya beda, pengecoh, kunci). Terhadap server
  // lama yang belum punya bidang itu, dipakai aturan sebelumnya: selisih prediksi atau daya beda.
  const perluDitinjau = (item: LaporanButir): boolean => {
    if (item.rekomendasi) return item.rekomendasi.length > 0;
    const selisih =
      item.prediksi_kesukaran !== null
        ? Math.abs(item.prediksi_kesukaran - item.tingkat_kesukaran_aktual)
        : 0;
    return selisih >= 0.25 || (dayaBedaAda && item.daya_beda < 0.2);
  };
  const butirPerluTinjau = laporan.analisis_butir.filter(perluDitinjau).length;
  const statistik = laporan.statistik_skor;
  const kr20 = laporan.reliabilitas?.kr20 ?? null;
  const jumlahButir = laporan.analisis_butir.length;
  const pengecohAda = laporan.pengecoh_dianalisis !== false;
  const temuanTeks = (kode: string, opsi: string | null): string => {
    const buat = t.laporan.temuan[kode as keyof typeof t.laporan.temuan] as
      | ((opsi: string | null) => string)
      | undefined;
    return buat ? buat(opsi) : kode;
  };

  return (
    <div>
      <PageHeader
        title={t.laporan.judul(laporan.judul)}
        description={t.laporan.deskripsi}
        action={
          <Link href={`/ujian/${ujianId}`}>
            <Button variant="secondary" size="sm">
              {t.laporan.kembali}
            </Button>
          </Link>
        }
      />

      {laporan.daya_beda_indikatif && (
        <div className="p-3 mb-4 border border-[var(--status-ditandai)]/30 bg-[var(--status-ditandai-bg)] text-xs text-[var(--status-ditandai)] leading-relaxed">
          {dayaBedaAda
            ? t.laporan.peringatanIndikatif(laporan.total_peserta, laporan.min_peserta_bermakna ?? 30)
            : t.laporan.peringatanSangatSedikit(laporan.total_peserta)}
        </div>
      )}

      <div className="border border-[var(--line)] bg-[var(--surface)] mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--line)]">
          <div className="p-6">
            <span className="text-xs font-medium text-[var(--ink-muted)] font-sans block mb-1.5">
              {t.laporan.ringkasan.totalPeserta}
            </span>
            <div className="font-serif text-4xl font-normal text-[var(--ink)] tabular-nums">
              {laporan.total_peserta}
            </div>
            <p className="text-xs text-[var(--ink-muted)] mt-1.5">
              {t.laporan.ringkasan.totalPesertaKet}
            </p>
          </div>

          <div className="p-6">
            <span className="text-xs font-medium text-[var(--ink-muted)] font-sans block mb-1.5">
              {t.laporan.ringkasan.jumlahButir}
            </span>
            <div className="font-serif text-4xl font-normal text-[var(--ink)] tabular-nums">
              {laporan.analisis_butir.length}
            </div>
            <p className="text-xs text-[var(--ink-muted)] mt-1.5">
              {t.laporan.ringkasan.jumlahButirKet}
            </p>
          </div>

          <div className="p-6">
            <span className="text-xs font-medium text-[var(--ink-muted)] font-sans block mb-1.5">
              {t.laporan.ringkasan.perluDitinjau}
            </span>
            <div
              className={`font-serif text-4xl font-normal tabular-nums ${
                butirPerluTinjau > 0 ? "text-[var(--status-ditandai)]" : "text-[var(--ink)]"
              }`}
            >
              {butirPerluTinjau}
            </div>
            <p className="text-xs text-[var(--ink-muted)] mt-1.5">
              {t.laporan.ringkasan.perluDitinjauKet}
            </p>
          </div>
        </div>

        {statistik && (
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--line)] border-t border-[var(--line)]">
            <div className="p-6">
              <span className="text-xs font-medium text-[var(--ink-muted)] font-sans block mb-1.5">
                {t.laporan.ringkasan.rataRata}
              </span>
              <div className="font-serif text-4xl font-normal text-[var(--ink)] tabular-nums">
                {statistik.rata_rata.toFixed(1)}
                <span className="text-lg text-[var(--ink-muted)]">/{jumlahButir}</span>
              </div>
              <p className="text-xs text-[var(--ink-muted)] mt-1.5">
                {t.laporan.ringkasan.rataRataKet(statistik.simpangan_baku.toFixed(2))}
              </p>
            </div>

            <div className="p-6">
              <span className="text-xs font-medium text-[var(--ink-muted)] font-sans block mb-1.5">
                {t.laporan.ringkasan.rentang}
              </span>
              <div className="font-serif text-4xl font-normal text-[var(--ink)] tabular-nums">
                {statistik.minimum}–{statistik.maksimum}
              </div>
              <p className="text-xs text-[var(--ink-muted)] mt-1.5">
                {t.laporan.ringkasan.rentangKet(statistik.median.toFixed(1))}
              </p>
            </div>

            <div className="p-6">
              <span className="text-xs font-medium text-[var(--ink-muted)] font-sans block mb-1.5">
                {t.laporan.ringkasan.reliabilitas}
              </span>
              {kr20 !== null && laporan.reliabilitas?.kategori ? (
                <>
                  <div className="font-serif text-4xl font-normal text-[var(--ink)] tabular-nums">
                    {kr20.toFixed(2)}
                    <span className="ml-2 font-sans text-sm text-[var(--ink-muted)]">
                      {t.laporan.kategoriReliabilitas[laporan.reliabilitas.kategori]}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--ink-muted)] mt-1.5">
                    {t.laporan.ringkasan.reliabilitasKet}
                  </p>
                </>
              ) : (
                <p className="text-xs text-[var(--ink-muted)] mt-1.5 leading-relaxed">
                  {t.laporan.ringkasan.reliabilitasTakAda}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between border-b border-[var(--line)] pb-2">
          <h2 className="font-serif text-lg font-normal text-[var(--ink)]">
            {t.laporan.kalibrasi}
          </h2>
          <span className="text-xs text-[var(--ink-muted)] font-mono">
            {t.laporan.butirNaskah(laporan.analisis_butir.length)}
          </span>
        </div>

        <div className="border border-[var(--line)] bg-[var(--canvas)] overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-[var(--surface)] border-b border-[var(--line)]">
              <tr>
                <th className="w-12 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)] font-mono">
                  #
                </th>
                <th className="px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)]">
                  {t.laporan.kolom.pertanyaan}
                </th>
                <th className="w-20 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)]">
                  {t.laporan.kolom.bloom}
                </th>
                <th className="w-52 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)]">
                  {t.laporan.kolom.prediksiAktual}
                </th>
                <th className="w-28 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)] font-mono">
                  {t.laporan.kolom.dayaBeda}
                </th>
                <th className="w-28 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)] font-mono">
                  {t.laporan.kolom.rasioBenar}
                </th>
                <th className="w-32 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)] text-right">
                  {t.laporan.kolom.status}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {laporan.analisis_butir.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-xs text-[var(--ink-muted)] font-normal"
                  >
                    <div className="flex flex-col items-center justify-center gap-2 select-none py-2">
                      <PackageOpen
                        size={40}
                        strokeWidth={1.25}
                        className="text-[var(--ink-muted)]/65"
                      />
                      <span>{t.laporan.kosong}</span>
                    </div>
                  </td>
                </tr>
              ) : (
                laporan.analisis_butir.map((item, i) => {
                  const predPct =
                    item.prediksi_kesukaran !== null
                      ? Math.round(item.prediksi_kesukaran * 100)
                      : null;
                  const aktPct = Math.round(item.tingkat_kesukaran_aktual * 100);
                  const delta = predPct !== null ? aktPct - predPct : null;
                  const isDiscrepant = perluDitinjau(item);
                  const detailTerbuka = !!terbuka[item.butir_id];

                  return (
                    <Fragment key={item.butir_id}>
                    <tr
                    className="hover:bg-[var(--surface)]/60 transition-colors duration-140"
                  >
                    <td className="px-3 py-2.5 font-mono text-xs text-[var(--ink-muted)] tabular-nums">
                      {i + 1}
                    </td>
                    <td className="px-3 py-2.5 max-w-sm">
                      <p className="font-serif text-sm text-[var(--ink)] line-clamp-2 leading-relaxed">
                        <MathText text={item.pertanyaan} />
                      </p>
                    </td>
                    <td className="px-3 py-2.5">
                      <BloomChip level={item.level_bloom} />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2 font-mono text-xs tabular-nums">
                        <span className="text-[var(--ink-muted)]">
                          {predPct !== null ? `${predPct}%` : "-"}
                        </span>
                        <span className="text-[var(--line-strong)]">→</span>
                        <span className="font-medium text-[var(--ink)]">
                          {aktPct}%
                        </span>

                        {delta !== null && Math.abs(delta) > 0 && (
                          <span
                            className={`inline-block px-1 py-0.2 rounded text-[10px] font-mono tabular-nums border ${
                              delta > 0
                                ? "bg-[var(--status-ditolak-bg)] text-[var(--status-ditolak)] border-[var(--status-ditolak)]/30"
                                : "bg-[var(--status-diterima-bg)] text-[var(--status-diterima)] border-[var(--status-diterima)]/30"
                            }`}
                          >
                            {delta > 0 ? `+${delta}%` : `${delta}%`}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs tabular-nums">
                      {dayaBedaAda ? (
                        <span
                          className={
                            item.daya_beda >= 0.3
                              ? "text-[var(--status-diterima)] font-medium"
                              : item.daya_beda >= 0.2
                              ? "text-[var(--status-ditandai)] font-medium"
                              : "text-[var(--status-ditolak)] font-semibold"
                          }
                        >
                          {item.daya_beda.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-[var(--ink-muted)]">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-[var(--ink-muted)] tabular-nums">
                      {item.total_benar}/{item.total_jawab}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex flex-col items-end gap-1.5">
                        {isDiscrepant ? (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-mono font-medium bg-[var(--status-ditandai-bg)] text-[var(--status-ditandai)] border border-[var(--status-ditandai)]/30">
                            {t.laporan.perluDitinjauBadge}
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--ink-muted)] font-mono">
                            {t.laporan.stabil}
                          </span>
                        )}
                        {item.pengecoh && (
                          <button
                            type="button"
                            onClick={() =>
                              setTerbuka((lama) => ({ ...lama, [item.butir_id]: !lama[item.butir_id] }))
                            }
                            aria-expanded={detailTerbuka}
                            aria-controls={`detail-${item.butir_id}`}
                            aria-label={t.laporan.detail.aria(i + 1)}
                            className="inline-flex items-center gap-1 rounded text-xs text-[var(--accent-text)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)]"
                          >
                            {detailTerbuka ? t.laporan.detail.sembunyikan : t.laporan.detail.tampilkan}
                            <ChevronDown
                              size={13}
                              strokeWidth={1.8}
                              aria-hidden="true"
                              className={`transition-transform duration-200 ${detailTerbuka ? "rotate-180" : ""}`}
                            />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {detailTerbuka && item.pengecoh && (
                    <tr id={`detail-${item.butir_id}`} className="bg-[var(--surface)]/40">
                      <td colSpan={7} className="px-4 py-4">
                        <div className="grid gap-6 lg:grid-cols-2">
                          <div>
                            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3">
                              <h3 className="font-serif text-sm text-[var(--ink)]">
                                {t.laporan.detail.judulPengecoh}
                              </h3>
                              {item.kategori_kesukaran && (
                                <span className="font-mono text-[11px] text-[var(--ink-muted)]">
                                  {t.laporan.kategoriKesukaran[item.kategori_kesukaran]}
                                  {item.kategori_daya_beda &&
                                    ` · ${t.laporan.kategoriDayaBeda[item.kategori_daya_beda]}`}
                                </span>
                              )}
                            </div>
                            <table className="w-full border-collapse text-left font-mono text-xs tabular-nums">
                              <thead>
                                <tr className="border-b border-[var(--line)] text-[var(--ink-muted)]">
                                  <th className="py-1.5 pr-3 font-medium">{t.laporan.detail.kolomOpsi}</th>
                                  <th className="py-1.5 pr-3 font-medium">{t.laporan.detail.kolomDipilih}</th>
                                  <th className="py-1.5 pr-3 font-medium">{t.laporan.detail.kolomAtas}</th>
                                  <th className="py-1.5 font-medium">{t.laporan.detail.kolomBawah}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[var(--line)]">
                                {item.pengecoh.map((p) => (
                                  <tr key={p.opsi} className={p.kunci ? "text-[var(--status-diterima)]" : "text-[var(--ink)]"}>
                                    <td className="py-1.5 pr-3 font-semibold">
                                      {p.opsi}
                                      {p.kunci && (
                                        <span className="ml-1.5 font-normal text-[var(--ink-muted)]">
                                          {t.laporan.detail.kunci}
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-1.5 pr-3">
                                      {p.dipilih} ({Math.round(p.persen * 100)}%)
                                    </td>
                                    <td className="py-1.5 pr-3">{pengecohAda ? p.atas : "-"}</td>
                                    <td className="py-1.5">{pengecohAda ? p.bawah : "-"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {!!item.tidak_menjawab && (
                              <p className="mt-2 text-xs text-[var(--ink-muted)]">
                                {t.laporan.detail.tidakMenjawab(item.tidak_menjawab)}
                              </p>
                            )}
                            <p className="mt-2 text-[11px] text-[var(--ink-muted)]">
                              {t.laporan.detail.kelompokKet}
                            </p>
                            {!pengecohAda && (
                              <p className="mt-1 text-[11px] text-[var(--status-ditandai)]">
                                {t.laporan.detail.pengecohButuh(
                                  laporan.total_peserta,
                                  laporan.min_peserta_pengecoh ?? 10,
                                )}
                              </p>
                            )}
                          </div>

                          <div>
                            <h3 className="mb-2 font-serif text-sm text-[var(--ink)]">
                              {t.laporan.detail.temuanJudul}
                            </h3>
                            {item.rekomendasi && item.rekomendasi.length > 0 ? (
                              <ul className="space-y-1.5 text-xs leading-relaxed text-[var(--ink)]">
                                {item.rekomendasi.map((r, k) => (
                                  <li key={`${r.kode}-${r.opsi ?? ""}-${k}`} className="flex gap-2">
                                    <span aria-hidden="true" className="mt-[7px] h-1 w-1 shrink-0 bg-[var(--status-ditandai)]" />
                                    <span>{temuanTeks(r.kode, r.opsi)}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-[var(--ink-muted)]">{t.laporan.detail.tanpaTemuan}</p>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                );
              }))}
            </tbody>
          </table>
        </div>

        <div className="border border-[var(--line)] bg-[var(--surface)] p-4 text-xs text-[var(--ink-muted)] max-w-lg space-y-1">
          <div className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink)] font-semibold">
            {t.laporan.pedomanJudul}
          </div>
          <div className="font-mono text-[11px]">
            {t.laporan.pedoman}
          </div>
        </div>
      </section>
    </div>
  );
}
