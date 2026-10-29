"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { apiFetch, unduhBerkas } from "@/lib/api";
import { formatWaktu } from "@/lib/format";
import { PaketUjian, PesertaUjian } from "@/lib/types";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import Input from "@/components/ui/Input";
import { useTeks } from "@/lib/teks";
import { susunNomorHalaman } from "@/lib/pagination";

const PESERTA_PER_HALAMAN = 10;

function untukInputWaktu(d: Date) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export default function UjianDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = useTeks().ujian;
  const resolvedParams = use(params);
  const ujianId = resolvedParams.id;

  const [ujian, setUjian] = useState<PaketUjian | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<"kode" | "tautan" | null>(null);
  const [denganKunci, setDenganKunci] = useState(false);
  const [mengekspor, setMengekspor] = useState<"pdf" | "docx" | null>(null);
  const [peserta, setPeserta] = useState<PesertaUjian[]>([]);
  const [pesertaLoading, setPesertaLoading] = useState(false);
  const [halamanPeserta, setHalamanPeserta] = useState(1);
  const [rilisHasil, setRilisHasil] = useState<"otomatis" | "manual">("otomatis");
  const [rilisLoading, setRilisLoading] = useState(false);
  const [waktuMulai, setWaktuMulai] = useState(() => untukInputWaktu(new Date()));
  const [waktuSelesai, setWaktuSelesai] = useState(() =>
    untukInputWaktu(new Date(Date.now() + 24 * 60 * 60 * 1000))
  );

  async function loadUjian() {
    try {
      const data = await apiFetch(`/api/ujian/${ujianId}`);
      setUjian(data);
      muatPeserta();
    } catch {}
  }

  useEffect(() => {
    setHalamanPeserta(1);
    loadUjian();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dimuat ulang hanya saat id ujian berganti
  }, [ujianId]);

  async function handleTerbitkan() {
    setError("");
    const mulai = new Date(waktuMulai);
    const selesai = new Date(waktuSelesai);
    if (isNaN(mulai.getTime()) || isNaN(selesai.getTime())) {
      setError(t.detail.jadwal.isiWaktu);
      return;
    }
    if (selesai <= mulai) {
      setError(t.detail.jadwal.selesaiSetelahMulai);
      return;
    }
    setLoading(true);
    try {
      await apiFetch(`/api/ujian/${ujianId}/terbitkan`, {
        method: "POST",
        body: JSON.stringify({
          waktu_mulai: mulai.toISOString(),
          waktu_selesai: selesai.toISOString(),
          rilis_hasil: rilisHasil,
        }),
      });
      await loadUjian();
    } catch (err: any) {
      setError(err.message || t.detail.jadwal.galat);
    } finally {
      setLoading(false);
    }
  }

  async function muatPeserta() {
    setPesertaLoading(true);
    try {
      const data = await apiFetch(`/api/ujian/${ujianId}/peserta`);
      setPeserta(Array.isArray(data) ? data : []);
    } catch {
      setPeserta([]);
    } finally {
      setPesertaLoading(false);
    }
  }

  async function handleLepasSesi(p: PesertaUjian) {
    if (!p.id) return;
    if (
      !confirm(t.detail.peserta.konfirmasiLepas(p.nama_siswa))
    )
      return;
    setError("");
    try {
      await apiFetch(`/api/ujian/${ujianId}/peserta/${p.id}/lepas-sesi`, { method: "POST" });
      await muatPeserta();
    } catch (err: any) {
      setError(err.message || t.detail.peserta.galatLepas);
    }
  }

  async function handleRilis(dirilis: boolean) {
    setError("");
    setRilisLoading(true);
    try {
      const baru = await apiFetch(`/api/ujian/${ujianId}/rilis-hasil`, {
        method: "PUT",
        body: JSON.stringify({ dirilis }),
      });
      setUjian(baru);
    } catch (err: any) {
      setError(err.message || t.detail.hasil.galat);
    } finally {
      setRilisLoading(false);
    }
  }

  async function handleExport(format: "pdf" | "docx") {
    setError("");
    setMengekspor(format);
    try {
      await unduhBerkas(
        `/api/ujian/${ujianId}/export?format=${format}&kunci=${denganKunci}`,
        `ujian.${format}`
      );
    } catch (err: any) {
      setError(err.message || t.detail.cetak.galat);
    } finally {
      setMengekspor(null);
    }
  }

  function handleCopy(apa: "kode" | "tautan") {
    if (!ujian?.kode_akses) return;
    const teks =
      apa === "kode"
        ? ujian.kode_akses
        : `${window.location.origin}/akses-ujian/${ujian.kode_akses}`;
    navigator.clipboard.writeText(teks);
    setCopied(apa);
    setTimeout(() => setCopied(null), 2000);
  }

  const jumlahHalamanPeserta = Math.max(1, Math.ceil(peserta.length / PESERTA_PER_HALAMAN));
  const halamanPesertaAktif = Math.min(halamanPeserta, jumlahHalamanPeserta);
  const indeksAwalPeserta = (halamanPesertaAktif - 1) * PESERTA_PER_HALAMAN;
  const pesertaTerlihat = peserta.slice(indeksAwalPeserta, indeksAwalPeserta + PESERTA_PER_HALAMAN);
  const nomorHalamanPeserta = susunNomorHalaman(halamanPesertaAktif, jumlahHalamanPeserta);

  function bukaHalamanPeserta(berikut: number) {
    setHalamanPeserta(berikut);
    document.getElementById("peserta-ujian")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function navigasiPeserta() {
    if (jumlahHalamanPeserta <= 1) return null;
    return (
      <nav
        aria-label={t.detail.peserta.navigasiHalaman}
        className="flex flex-wrap items-center justify-between gap-3 border-y border-[var(--line)] py-2.5"
      >
        <span className="text-xs text-[var(--ink-muted)] tabular-nums">
          {t.detail.peserta.rentang(
            indeksAwalPeserta + 1,
            indeksAwalPeserta + pesertaTerlihat.length,
            peserta.length,
          )}
        </span>
        <div className="flex items-center justify-end gap-1">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="!h-7 !w-7 !p-0 shrink-0"
            aria-label={t.detail.peserta.sebelumnya}
            disabled={halamanPesertaAktif === 1}
            onClick={() => bukaHalamanPeserta(halamanPesertaAktif - 1)}
          >
            ‹
          </Button>
          <div role="group" aria-label={t.detail.peserta.navigasiHalaman} className="flex items-center gap-0.5">
            {nomorHalamanPeserta.map((nomor, indeks) => typeof nomor === "number" ? (
              <button
                key={nomor}
                type="button"
                aria-label={t.detail.peserta.halaman(nomor, jumlahHalamanPeserta)}
                aria-current={nomor === halamanPesertaAktif ? "page" : undefined}
                onClick={() => bukaHalamanPeserta(nomor)}
                className={`inline-flex h-7 min-w-6 items-center justify-center border px-1 font-mono text-xs tabular-nums transition-colors duration-[140ms] ${
                  nomor === halamanPesertaAktif
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-text)]"
                    : "border-[var(--line-strong)] bg-[var(--canvas)] text-[var(--ink-muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
                }`}
              >
                {nomor}
              </button>
            ) : (
              <span key={`${nomor}-${indeks}`} className="px-1 text-xs text-[var(--ink-muted)]" aria-hidden="true">
                …
              </span>
            ))}
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="!h-7 !w-7 !p-0 shrink-0"
            aria-label={t.detail.peserta.berikutnya}
            disabled={halamanPesertaAktif === jumlahHalamanPeserta}
            onClick={() => bukaHalamanPeserta(halamanPesertaAktif + 1)}
          >
            ›
          </Button>
        </div>
      </nav>
    );
  }

  if (!ujian) {
    return (
      <div className="border border-[var(--line)] bg-[var(--surface)] p-8 text-center text-xs text-[var(--ink-muted)] font-mono">
        {t.detail.memuat}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={ujian.judul}
        description={t.detail.deskripsi}
        action={
          <Link href={`/laporan/${ujianId}`}>
            <Button variant="secondary" size="sm">
              {t.detail.laporanAnalisis}
            </Button>
          </Link>
        }
      />

      {ujian.kode_akses && (
        <div className="border border-[var(--line-strong)] bg-[var(--surface)] p-4 sm:p-6 mb-8 text-center rounded-none">
          <span className="text-xs font-sans text-[var(--ink-muted)] block">
            {t.detail.kode.judul}
          </span>
          <div className="font-mono text-3xl sm:text-5xl font-bold tracking-widest sm:tracking-[0.3em] text-[var(--ink)] my-3 select-all break-all sm:pl-[0.3em]">
            {ujian.kode_akses}
          </div>
          <p className="text-xs text-[var(--ink-muted)] mb-4 max-w-sm mx-auto">
            {t.detail.kode.petunjuk}
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleCopy("kode")}
              className="font-mono text-xs"
            >
              {copied === "kode" ? t.detail.kode.kodeTersalin : t.detail.kode.salinKode}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleCopy("tautan")}
              className="font-mono text-xs"
            >
              {copied === "tautan" ? t.detail.kode.tautanTersalin : t.detail.kode.salinTautan}
            </Button>
          </div>
        </div>
      )}

      {(ujian.status === "aktif" || pesertaLoading || peserta.length > 0) && (
        <div id="peserta-ujian" className="border border-[var(--line)] bg-[var(--canvas)] p-6 mb-6 scroll-mt-4">
          <div className="flex items-baseline justify-between border-b border-[var(--line)] pb-2 mb-4">
            <h2 className="font-serif text-lg font-normal text-[var(--ink)]">{t.detail.peserta.judul}</h2>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-[var(--ink-muted)] tabular-nums">
                {t.detail.peserta.terkumpul(peserta.filter((p) => p.terkumpul).length, peserta.length)}
              </span>
              <button
                type="button"
                onClick={muatPeserta}
                disabled={pesertaLoading}
                className="text-xs text-[var(--accent-text)] hover:underline font-medium disabled:opacity-50"
              >
                {pesertaLoading ? t.detail.peserta.memuat : t.detail.peserta.muatUlang}
              </button>
            </div>
          </div>
          <p className="mb-3 text-xs leading-relaxed text-[var(--ink-muted)]">
            {t.detail.peserta.nilaiKeterangan}
          </p>
          {peserta.length === 0 ? (
            <p className="text-xs text-[var(--ink-muted)]">
              {pesertaLoading ? t.detail.peserta.memuat : t.detail.peserta.kosong}
            </p>
          ) : (
            <>
              {navigasiPeserta()}
              <div className="overflow-x-auto">
                <table aria-label={t.detail.peserta.judul} className="w-full border-collapse text-left text-sm">
                  <thead className="border-b border-[var(--line)] bg-[var(--surface)]">
                    <tr>
                      <th scope="col" className="w-12 px-3 py-2.5 text-center font-mono text-xs font-medium text-[var(--ink-muted)]">#</th>
                      <th scope="col" className="min-w-[12rem] px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)]">{t.detail.peserta.kolomNama}</th>
                      <th scope="col" className="w-28 px-3 py-2.5 text-right text-xs font-medium text-[var(--ink-muted)]">{t.detail.peserta.kolomTerjawab}</th>
                      <th scope="col" className="w-28 px-3 py-2.5 text-right text-xs font-medium text-[var(--ink-muted)]">{t.detail.peserta.kolomBenar}</th>
                      <th scope="col" className="w-24 px-3 py-2.5 text-right text-xs font-medium text-[var(--ink-muted)]">{t.detail.peserta.nilai}</th>
                      <th scope="col" className="w-32 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)]">{t.detail.peserta.kolomStatus}</th>
                      {ujian.status === "aktif" && <th scope="col" className="w-40 px-3 py-2.5 text-right text-xs font-medium text-[var(--ink-muted)]">{t.detail.peserta.kolomAksi}</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line)]">
                    {pesertaTerlihat.map((p, indeks) => (
                      <tr key={p.id ?? p.nama_siswa} className="hover:bg-[var(--surface)]/60 transition-colors duration-[140ms]">
                        <td className="px-3 py-2.5 text-center font-mono text-xs tabular-nums text-[var(--ink-muted)]">
                          {indeksAwalPeserta + indeks + 1}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="font-serif text-sm text-[var(--ink)]">{p.nama_siswa}</span>
                          {p.masuk_pada && (
                            <span className="mt-0.5 block font-mono text-[10px] text-[var(--ink-muted)] tabular-nums">
                              {t.detail.peserta.masuk(formatWaktu(p.masuk_pada))}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-[var(--ink-muted)]">
                          {p.terjawab}/{p.total_soal}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-[var(--ink-muted)]">
                          {p.total_benar === null ? "—" : `${p.total_benar}/${p.total_soal}`}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-[var(--ink)]">
                          {p.nilai === null ? "—" : p.nilai.toFixed(1)}
                        </td>
                        <td className="px-3 py-2.5 text-xs">
                          <span className={p.terkumpul ? "font-medium text-[var(--status-diterima)]" : "font-medium text-[var(--status-ditandai)]"}>
                            {p.terkumpul ? t.detail.peserta.statusTerkumpul : t.detail.peserta.statusMengerjakan}
                          </span>
                        </td>
                        {ujian.status === "aktif" && (
                          <td className="px-3 py-2.5 text-right text-xs">
                            {p.id && !p.terkumpul ? (
                              <button
                                type="button"
                                onClick={() => handleLepasSesi(p)}
                                title={t.detail.peserta.izinkanTitle}
                                className="text-[var(--ink-muted)] underline hover:text-[var(--ink)]"
                              >
                                {t.detail.peserta.izinkanMasukUlang}
                              </button>
                            ) : "—"}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {navigasiPeserta()}
            </>
          )}
        </div>
      )}

      {ujian.status === "aktif" && (
        <div className="border border-[var(--line)] bg-[var(--canvas)] p-6 mb-6">
          <h2 className="font-serif text-lg font-normal text-[var(--ink)] border-b border-[var(--line)] pb-2 mb-4">
            {t.detail.hasil.judul}
          </h2>
          {ujian.rilis_hasil === "manual" ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm">
                <span
                  className={`font-medium ${ujian.hasil_dirilis ? "text-[var(--status-diterima)]" : "text-[var(--status-ditandai)]"}`}
                >
                  {ujian.hasil_dirilis ? t.detail.hasil.sudahDirilis : t.detail.hasil.belumDirilis}
                </span>
                <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                  {ujian.hasil_dirilis
                    ? t.detail.hasil.ketSudahDirilis
                    : t.detail.hasil.ketBelumDirilis}
                </p>
              </div>
              <Button
                variant={ujian.hasil_dirilis ? "secondary" : "primary"}
                size="sm"
                disabled={rilisLoading}
                onClick={() => handleRilis(!ujian.hasil_dirilis)}
              >
                {rilisLoading ? t.detail.hasil.memproses : ujian.hasil_dirilis ? t.detail.hasil.tarikKembali : t.detail.hasil.rilisSekarang}
              </Button>
            </div>
          ) : (
            <p className="text-xs text-[var(--ink-muted)]">
              {t.detail.hasil.otomatis}
            </p>
          )}
        </div>
      )}

      <div className="border border-[var(--line)] bg-[var(--canvas)] p-6 mb-6">
        <h2 className="font-serif text-lg font-normal text-[var(--ink)] border-b border-[var(--line)] pb-2 mb-4">
          {t.detail.cetak.judul}
        </h2>
        <p className="text-xs text-[var(--ink-muted)] mb-3">
          {t.detail.cetak.deskripsi}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-[var(--ink-muted)] cursor-pointer select-none mr-2">
            <input
              type="checkbox"
              checked={denganKunci}
              onChange={(e) => setDenganKunci(e.target.checked)}
              className="accent-[var(--accent)]"
            />
            {t.detail.cetak.sertakanKunci}
          </label>
          {(["pdf", "docx"] as const).map((f) => (
            <Button
              key={f}
              variant="secondary"
              size="sm"
              disabled={mengekspor !== null}
              onClick={() => handleExport(f)}
            >
              {mengekspor === f ? t.detail.cetak.menyiapkan : t.detail.cetak.unduh(f.toUpperCase())}
            </Button>
          ))}
        </div>
      </div>

      <div className="border border-[var(--line)] bg-[var(--canvas)] p-6 mb-6">
        <h2 className="font-serif text-lg font-normal text-[var(--ink)] border-b border-[var(--line)] pb-2 mb-4">
          {t.detail.spesifikasi.judul}
        </h2>

        <div className="divide-y divide-[var(--line)] text-sm">
          <div className="py-2.5 flex justify-between items-center">
            <span className="text-xs text-[var(--ink-muted)] font-sans">
              {t.detail.spesifikasi.status}
            </span>
            <StatusBadge status={ujian.status} />
          </div>

          <div className="py-2.5 flex justify-between items-center">
            <span className="text-xs text-[var(--ink-muted)] font-sans">
              {t.detail.spesifikasi.jumlahButir}
            </span>
            <span className="font-mono font-medium text-[var(--ink)] tabular-nums">
              {t.detail.spesifikasi.butir(ujian.butir_list?.length ?? 0)}
            </span>
          </div>

          <div className="py-2.5 flex justify-between items-center">
            <span className="text-xs text-[var(--ink-muted)] font-sans">
              {t.detail.spesifikasi.alokasi}
            </span>
            <span className="font-mono font-medium text-[var(--ink)] tabular-nums">
              {t.detail.spesifikasi.menit(ujian.durasi_menit)}
            </span>
          </div>

          {ujian.waktu_mulai && (
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-xs text-[var(--ink-muted)] font-sans">
                {t.detail.spesifikasi.waktuTerbit}
              </span>
              <span className="font-mono text-xs text-[var(--ink)] tabular-nums">
                {new Date(ujian.waktu_mulai).toLocaleString(t.lokal, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>
          )}

          {ujian.waktu_selesai && (
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-xs text-[var(--ink-muted)] font-sans">
                {t.detail.spesifikasi.batasPengumpulan}
              </span>
              <span className="font-mono text-xs text-[var(--ink)] tabular-nums">
                {new Date(ujian.waktu_selesai).toLocaleString(t.lokal, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 mb-6 text-xs leading-relaxed text-[var(--status-ditolak)]">
          {error}
        </div>
      )}

      {ujian.status === "draft" && (
        <div className="border border-[var(--line)] bg-[var(--canvas)] p-6 mb-6">
          <h2 className="font-serif text-lg font-normal text-[var(--ink)] border-b border-[var(--line)] pb-2 mb-4">
            {t.detail.jadwal.judul}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <Input
              label={t.detail.jadwal.waktuMulai}
              type="datetime-local"
              value={waktuMulai}
              onChange={(e) => setWaktuMulai(e.target.value)}
              helper={t.detail.jadwal.bantuanMulai}
            />
            <Input
              label={t.detail.jadwal.waktuSelesai}
              type="datetime-local"
              value={waktuSelesai}
              onChange={(e) => setWaktuSelesai(e.target.value)}
              helper={t.detail.jadwal.bantuanSelesai}
            />
          </div>
          <label className="flex flex-col gap-1 max-w-sm mb-5">
            <span className="text-sm font-medium text-[var(--ink)]">{t.detail.jadwal.rilisLabel}</span>
            <select
              value={rilisHasil}
              onChange={(e) => setRilisHasil(e.target.value as "otomatis" | "manual")}
              className="bg-[var(--canvas)] text-[var(--ink)] border border-[var(--line-strong)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent-text)]"
            >
              <option value="otomatis">{t.detail.jadwal.rilisOtomatis}</option>
              <option value="manual">{t.detail.jadwal.rilisManual}</option>
            </select>
            <span className="text-xs text-[var(--ink-muted)]">
              {rilisHasil === "manual"
                ? t.detail.jadwal.ketManual
                : t.detail.jadwal.ketOtomatis}
            </span>
          </label>
          <Button onClick={handleTerbitkan} disabled={loading} size="lg">
            {loading ? t.detail.jadwal.menerbitkan : t.detail.jadwal.terbitkan}
          </Button>
        </div>
      )}
    </div>
  );
}
