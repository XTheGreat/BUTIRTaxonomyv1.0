"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import {
  ambilToken,
  bacaAntrian,
  bacaSesi,
  hapusAntrian,
  hapusSesi,
  headerPeserta,
  keluarkanDariAntrian,
  simpanSesi,
  simpanToken,
  tambahKeAntrian,
} from "@/lib/peserta";
import PemilihBahasa from "@/components/layout/PemilihBahasa";
import { SoalUjian } from "@/lib/types";
import Button from "@/components/ui/Button";
import MathText from "@/components/ui/MathText";
import { useTeks } from "@/lib/teks";

export default function UjianSiswaPage({
  params,
}: {
  params: Promise<{ kodeAkses: string }>;
}) {
  const t = useTeks().ujian;
  const resolvedParams = use(params);
  const kodeAkses = resolvedParams.kodeAkses;
  const router = useRouter();

  const [step, setStep] = useState<"login" | "ujian">("login");
  const [namaSiswa, setNamaSiswa] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [soalList, setSoalList] = useState<SoalUjian[]>([]);
  const [jawaban, setJawaban] = useState<Record<string, string>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [judulUjian, setJudulUjian] = useState("");
  const [waktuSelesai, setWaktuSelesai] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [galatSimpan, setGalatSimpan] = useState("");
  const [belumTerkirim, setBelumTerkirim] = useState(0);
  const [memulihkan, setMemulihkan] = useState(true);
  const kirimRef = useRef<Promise<number> | null>(null);

  // Jawaban dikirim satu per satu dari antrian (nilai terbaru per butir) agar urutan klik tidak
  // tertukar di server. Kegagalan jaringan/5xx membiarkan jawaban di antrian untuk dicoba lagi;
  // penolakan 4xx (mis. sudah dikumpulkan) tidak akan pernah berhasil, jadi dibuang dan dilaporkan.
  const kirimAntrian = useCallback((): Promise<number> => {
    if (kirimRef.current) return kirimRef.current;
    const jalankan = async (): Promise<number> => {
      try {
        for (;;) {
          const entri = Object.entries(bacaAntrian(kodeAkses, namaSiswa));
          if (entri.length === 0) break;
          for (const [butirId, pilihan] of entri) {
            try {
              await apiFetch(
                `/api/siswa/ujian/${kodeAkses}/jawab?nama_siswa=${encodeURIComponent(namaSiswa)}`,
                {
                  method: "POST",
                  headers: headerPeserta(kodeAkses, namaSiswa),
                  body: JSON.stringify({ butir_id: butirId, jawaban_pilihan: pilihan }),
                }
              );
              keluarkanDariAntrian(kodeAkses, namaSiswa, butirId, pilihan);
              setGalatSimpan("");
            } catch (err: any) {
              const permanen =
                err instanceof ApiError &&
                err.status >= 400 &&
                err.status < 500 &&
                err.status !== 408 &&
                err.status !== 429;
              if (!permanen) return Object.keys(bacaAntrian(kodeAkses, namaSiswa)).length;
              keluarkanDariAntrian(kodeAkses, namaSiswa, butirId, pilihan);
              setGalatSimpan(t.siswa.belumTersimpanDengan(err.message));
            }
          }
        }
      } finally {
        setBelumTerkirim(Object.keys(bacaAntrian(kodeAkses, namaSiswa)).length);
      }
      return Object.keys(bacaAntrian(kodeAkses, namaSiswa)).length;
    };
    // finally pada promise selalu berjalan setelah baris berikut, jadi penanda tidak bisa tersangkut
    // walau antrian kosong dan fungsi selesai tanpa menunggu apa pun.
    const proses = jalankan().finally(() => {
      kirimRef.current = null;
    });
    kirimRef.current = proses;
    return proses;
  }, [kodeAkses, namaSiswa, t]);

  const masuk = useCallback(
    async (namaInput: string, otomatis: boolean, indeksAwal = 0) => {
      setError("");
      setLoading(true);
      try {
        const res = await apiFetch("/api/siswa/masuk", {
          method: "POST",
          body: JSON.stringify({
            kode_akses: kodeAkses,
            nama_siswa: namaInput,
            token: ambilToken(kodeAkses, namaInput),
          }),
        });
        const nama: string = res.nama_siswa;
        setNamaSiswa(nama);
        if (res.token_peserta) simpanToken(kodeAkses, nama, res.token_peserta);
        setJudulUjian(res.judul_ujian);
        if (res.waktu_selesai) {
          setWaktuSelesai(new Date(res.waktu_selesai));
        }

        const soalData = await apiFetch(
          `/api/siswa/ujian/${kodeAkses}/soal?nama_siswa=${encodeURIComponent(nama)}`,
          { headers: headerPeserta(kodeAkses, nama) }
        );
        if (soalData.sudah_dikumpulkan) {
          hapusSesi(kodeAkses);
          hapusAntrian(kodeAkses, nama);
          router.replace(`/akses-ujian/${kodeAkses}/hasil?nama=${encodeURIComponent(nama)}`);
          return;
        }
        const soal: SoalUjian[] = soalData.soal || [];
        // Jawaban yang masih mengantre di perangkat lebih baru daripada yang ada di server.
        const idSoal = new Set(soal.map((s) => s.id));
        const antrian = Object.fromEntries(
          Object.entries(bacaAntrian(kodeAkses, nama)).filter(([id]) => idSoal.has(id))
        );
        setSoalList(soal);
        setJawaban({ ...(soalData.jawaban_tersimpan || {}), ...antrian });
        setBelumTerkirim(Object.keys(antrian).length);
        setCurrentIdx(Math.min(indeksAwal, Math.max(soal.length - 1, 0)));
        setStep("ujian");
      } catch (err: any) {
        // Gagal jaringan saat memulihkan sesi: sesi dibiarkan agar bisa dicoba lagi.
        // Penolakan server (ujian berakhir, dll.) menghapusnya.
        if (otomatis && err instanceof ApiError) hapusSesi(kodeAkses);
        setError(err instanceof ApiError ? err.message || t.siswa.kodeTidakValid : t.siswa.koneksiGagal);
      } finally {
        setLoading(false);
        setMemulihkan(false);
      }
    },
    [kodeAkses, router, t]
  );

  // Muat ulang halaman di tengah ujian: masuk kembali otomatis dan lanjut dari butir terakhir.
  useEffect(() => {
    const sesi = bacaSesi(kodeAkses);
    if (!sesi) {
      setMemulihkan(false);
      return;
    }
    setNamaSiswa(sesi.nama);
    masuk(sesi.nama, true, sesi.indeks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kodeAkses]);

  function handleMasuk(e: React.FormEvent) {
    e.preventDefault();
    if (!namaSiswa.trim()) {
      setError(t.siswa.isiNama);
      return;
    }
    masuk(namaSiswa, false);
  }

  const kumpulkan = useCallback(
    async (otomatis: boolean) => {
      if (submitted) return;
      setSubmitted(true);
      setShowConfirmModal(false);
      // Kumpulkan manual menunggu jawaban yang tertahan terkirim dulu; saat waktu habis tetap
      // dikumpulkan karena tidak ada lagi kesempatan menunggu.
      const sisa = await kirimAntrian();
      if (sisa > 0 && !otomatis) {
        setGalatSimpan(t.siswa.masihAdaBelumTerkirim(sisa));
        setSubmitted(false);
        return;
      }
      try {
        await apiFetch(
          `/api/siswa/ujian/${kodeAkses}/submit?nama_siswa=${encodeURIComponent(
            namaSiswa
          )}`,
          { method: "POST", headers: headerPeserta(kodeAkses, namaSiswa) }
        );
        hapusSesi(kodeAkses);
        hapusAntrian(kodeAkses, namaSiswa);
        router.push(
          `/akses-ujian/${kodeAkses}/hasil?nama=${encodeURIComponent(namaSiswa)}`
        );
      } catch (err: any) {
        setGalatSimpan(err.message || t.siswa.galatKumpul);
        setSubmitted(false);
      }
    },
    [kodeAkses, namaSiswa, submitted, router, t, kirimAntrian]
  );

  useEffect(() => {
    if (step !== "ujian" || !waktuSelesai || submitted) return;
    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((waktuSelesai.getTime() - Date.now()) / 1000)
      );
      setTimeLeft(remaining);
      if (remaining <= 0) {
        kumpulkan(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [step, waktuSelesai, submitted, kumpulkan]);

  function saveJawaban(butirId: string, pilihan: string) {
    setJawaban((prev) => ({ ...prev, [butirId]: pilihan }));
    tambahKeAntrian(kodeAkses, namaSiswa, butirId, pilihan);
    setBelumTerkirim(Object.keys(bacaAntrian(kodeAkses, namaSiswa)).length);
    kirimAntrian();
  }

  // Simpan posisi butir agar muat ulang kembali ke butir yang sama.
  useEffect(() => {
    if (step === "ujian" && namaSiswa) simpanSesi(kodeAkses, { nama: namaSiswa, indeks: currentIdx });
  }, [step, kodeAkses, namaSiswa, currentIdx]);

  // Coba kirim ulang jawaban yang tertahan: berkala, saat koneksi kembali, dan saat tab aktif lagi.
  useEffect(() => {
    if (step !== "ujian") return;
    const coba = () => {
      if (Object.keys(bacaAntrian(kodeAkses, namaSiswa)).length > 0) kirimAntrian();
    };
    coba();
    const interval = setInterval(coba, 5000);
    window.addEventListener("online", coba);
    document.addEventListener("visibilitychange", coba);
    return () => {
      clearInterval(interval);
      window.removeEventListener("online", coba);
      document.removeEventListener("visibilitychange", coba);
    };
  }, [step, kodeAkses, namaSiswa, kirimAntrian]);

  // Peringatan bawaan peramban bila halaman ditutup saat masih ada jawaban yang belum terkirim.
  useEffect(() => {
    if (belumTerkirim === 0) return;
    const tahan = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", tahan);
    return () => window.removeEventListener("beforeunload", tahan);
  }, [belumTerkirim]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const totalTerjawab = Object.keys(jawaban).filter((k) => jawaban[k]).length;
  const totalBelumDijawab = soalList.length - totalTerjawab;

  if (memulihkan) {
    return (
      <div className="min-h-screen bg-[var(--canvas)] flex items-center justify-center p-4">
        <div
          role="status"
          className="border border-[var(--line)] bg-[var(--surface)] p-8 text-center text-xs text-[var(--ink-muted)] font-mono"
        >
          {t.siswa.memulihkanSesi}
        </div>
      </div>
    );
  }

  if (step === "login") {
    return (
      <div className="relative min-h-screen bg-[var(--canvas)] flex items-center justify-center p-4">
        <PemilihBahasa className="absolute right-4 top-4" />
        <div className="w-full max-w-sm border border-[var(--line)] bg-[var(--surface)] p-8">
          <div className="text-center mb-6">
            <span className="font-serif text-2xl font-medium tracking-tight text-[var(--ink)] block">
              {t.siswa.brand}
            </span>
            <span className="text-xs text-[var(--ink-muted)] block mt-0.5 font-sans">
              {t.siswa.lembarPengerjaan}
            </span>
          </div>

          <div className="border border-[var(--line)] bg-[var(--canvas)] p-3 text-center mb-5">
            <span className="text-xs font-sans text-[var(--ink-muted)] block mb-1">
              {t.siswa.kodeAksesNaskah}
            </span>
            <span className="font-mono text-2xl font-bold tracking-[0.2em] text-[var(--ink)] block pl-[0.2em]">
              {kodeAkses}
            </span>
          </div>

          <form onSubmit={handleMasuk} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="nama"
                className="text-xs font-medium text-[var(--ink)] font-sans"
              >
                {t.siswa.namaLengkap}
              </label>
              <input
                id="nama"
                type="text"
                value={namaSiswa}
                onChange={(e) => setNamaSiswa(e.target.value)}
                placeholder={t.siswa.placeholderNama}
                className="bg-[var(--canvas)] border border-[var(--line-strong)] rounded px-3 py-2.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)]/60 focus:outline-none focus:border-[var(--accent-text)]"
                autoComplete="name"
                required
              />
            </div>

            {error && (
              <div className="p-2.5 text-xs leading-relaxed text-[var(--status-ditolak)]">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] mt-2 text-sm"
            >
              {loading ? t.siswa.menyiapkan : t.siswa.mulai}
            </Button>
          </form>

          <p className="text-[11px] text-[var(--ink-muted)] text-center mt-6">
            {t.siswa.koneksi}
          </p>
        </div>
      </div>
    );
  }

  const currentSoal = soalList[currentIdx];

  const timerClass =
    timeLeft !== null && timeLeft <= 60
      ? "text-[var(--status-ditolak)] border-[var(--status-ditolak)]/40 bg-[var(--status-ditolak-bg)]"
      : timeLeft !== null && timeLeft <= 300
      ? "text-[var(--status-ditandai)] border-[var(--status-ditandai)]/40 bg-[var(--status-ditandai-bg)]"
      : "text-[var(--ink)] border-[var(--line)] bg-[var(--surface)]";

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)] flex flex-col">
      
      <header className="sticky top-0 z-30 bg-[var(--canvas)] border-b border-[var(--line)] px-4 py-2.5 sm:px-6">
        <div className="max-w-[680px] mx-auto flex items-center justify-between">
          <div className="min-w-0 pr-3">
            <h1 className="font-serif text-sm sm:text-base font-normal text-[var(--ink)] truncate">
              {judulUjian}
            </h1>
            <span className="text-[11px] text-[var(--ink-muted)] block truncate">
              {namaSiswa}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {timeLeft !== null && (
              <div
                className={`font-mono text-xs font-semibold px-2.5 py-1 rounded border tabular-nums ${timerClass}`}
                aria-label={t.siswa.sisaWaktu(formatTimer(timeLeft))}
              >
                {formatTimer(timeLeft)}
              </div>
            )}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowConfirmModal(true)}
              className="text-xs min-h-[36px]"
            >
              {t.siswa.kumpulkan}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[680px] w-full mx-auto px-4 py-6 sm:py-8 flex flex-col">
        {galatSimpan && (
          <div
            role="alert"
            className="mb-4 text-xs leading-relaxed text-[var(--status-ditolak)]"
          >
            {galatSimpan}
          </div>
        )}
        {belumTerkirim > 0 && (
          <div
            role="status"
            className="mb-4 text-xs leading-relaxed text-[var(--status-ditandai)]"
          >
            {t.siswa.menungguKirim(belumTerkirim)}
          </div>
        )}
        
        <div className="mb-6 pb-4 border-b border-[var(--line)]">
          <div className="flex items-center justify-between text-xs text-[var(--ink-muted)] mb-2.5 font-mono">
            <span>{t.siswa.daftarButir}</span>
            <span className="tabular-nums">
              {t.siswa.terjawabDari(totalTerjawab, soalList.length)}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {soalList.map((s, idx) => {
              const isCurrent = idx === currentIdx;
              const hasAnswer = Boolean(jawaban[s.id]);

              return (
                <button
                  key={s.id}
                  onClick={() => setCurrentIdx(idx)}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded text-xs font-mono font-medium flex items-center justify-center transition-colors relative ${
                    isCurrent
                      ? "border-2 border-[var(--ink)] bg-[var(--surface)] text-[var(--ink)] font-bold"
                      : hasAnswer
                      ? "border border-[var(--line)] bg-[var(--canvas)] text-[var(--ink)]"
                      : "border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-muted)]"
                  }`}
                  aria-label={t.siswa.soalNomor(idx + 1, hasAnswer)}
                >
                  <span className="tabular-nums">{idx + 1}</span>
                  {hasAnswer && !isCurrent && (
                    <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {currentSoal && (
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 text-xs font-mono text-[var(--ink-muted)]">
                <span>
                  {t.siswa.butirKe(currentIdx + 1, soalList.length)}
                </span>
                <span>{t.siswa.pilihanGanda}</span>
              </div>

              <div className="mb-6 sm:mb-8">
                <p className="font-serif text-[18px] sm:text-[20px] text-[var(--ink)] leading-relaxed">
                  <MathText text={currentSoal.pertanyaan} />
                </p>
              </div>

              <div className="space-y-2.5 mb-8">
                {Object.entries(currentSoal.pilihan || {}).map(([key, val]) => {
                  const isSelected = jawaban[currentSoal.id] === key;

                  return (
                    <button
                      key={key}
                      onClick={() => saveJawaban(currentSoal.id, key)}
                      aria-pressed={isSelected}
                      className="w-full min-h-[52px] p-3 rounded flex items-center justify-between gap-3 text-left transition-colors duration-140 border border-[var(--line-strong)] bg-[var(--canvas)] hover:bg-[var(--surface)] text-[var(--ink)]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        
                        <span
                          className={`w-7 h-7 shrink-0 rounded flex items-center justify-center font-mono text-xs font-semibold border ${
                            isSelected
                              ? "bg-[var(--ink)] text-white border-[var(--ink)]"
                              : "bg-[var(--surface)] text-[var(--ink)] border-[var(--line-strong)]"
                          }`}
                        >
                          {key}
                        </span>
                        
                        <span className="font-serif text-base sm:text-lg leading-normal">
                          <MathText text={val} />
                        </span>
                      </div>

                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-6 border-t border-[var(--line)] flex items-center justify-between">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setCurrentIdx((p) => Math.max(0, p - 1))}
                disabled={currentIdx === 0}
                className="min-h-[44px]"
              >
                {t.siswa.sebelumnya}
              </Button>

              {currentIdx < soalList.length - 1 ? (
                <Button
                  size="md"
                  onClick={() =>
                    setCurrentIdx((p) => Math.min(soalList.length - 1, p + 1))
                  }
                  className="min-h-[44px]"
                >
                  {t.siswa.selanjutnya}
                </Button>
              ) : (
                <Button
                  size="md"
                  variant="primary"
                  onClick={() => setShowConfirmModal(true)}
                  className="min-h-[44px]"
                >
                  {t.siswa.selesaiKumpulkan}
                </Button>
              )}
            </div>
          </div>
        )}
      </main>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--scrim)] p-4">
          <div
            className="w-full max-w-md bg-[var(--canvas)] border border-[var(--line)] p-6 rounded"
            style={{ boxShadow: "var(--shadow-overlay)" }}
          >
            <h2 className="font-serif text-xl font-normal text-[var(--ink)] mb-2">
              {t.siswa.konfirmasi.judul}
            </h2>

            <div className="border border-[var(--line)] bg-[var(--surface)] p-3.5 my-4 text-xs font-mono space-y-1">
              <div className="flex justify-between">
                <span className="text-[var(--ink-muted)]">{t.siswa.konfirmasi.soalTerjawab}</span>
                <span className="font-medium text-[var(--ink)] tabular-nums">
                  {t.siswa.konfirmasi.terjawabDari(totalTerjawab, soalList.length)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--ink-muted)]">{t.siswa.konfirmasi.belumTerjawab}</span>
                <span
                  className={`font-medium tabular-nums ${
                    totalBelumDijawab > 0 ? "text-[var(--status-ditolak)]" : "text-[var(--status-diterima)]"
                  }`}
                >
                  {t.siswa.konfirmasi.butir(totalBelumDijawab)}
                </span>
              </div>
            </div>

            {totalBelumDijawab > 0 ? (
              <p className="text-xs text-[var(--status-ditandai)] mb-5 leading-relaxed">
                {t.siswa.konfirmasi.peringatan(totalBelumDijawab)}
              </p>
            ) : (
              <p className="text-xs text-[var(--ink-muted)] mb-5 leading-relaxed">
                {t.siswa.konfirmasi.semuaTerisi}
              </p>
            )}

            <div className="flex items-center justify-end gap-2.5">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowConfirmModal(false)}
              >
                {t.siswa.konfirmasi.lanjutkan}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => kumpulkan(false)}
                disabled={submitted}
              >
                {submitted ? t.siswa.konfirmasi.mengirim : t.siswa.konfirmasi.ya}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
