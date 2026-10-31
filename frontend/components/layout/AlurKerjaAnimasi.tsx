"use client";

import { useEffect, useMemo, useState } from "react";
import { useTeks } from "@/lib/teks";

const KECEPATAN_KETIK = 22;

// Warna panel dikendalikan variabel --alur-* (app/globals.css). Saat animasi mengetik selesai, lapisan
// kedua berisi salinan isi yang sama dengan warna terbalik (latar hijau BUTIR, semua isi putih)
// disapukan di atasnya secara diagonal dari kiri atas ke kanan bawah. Di layar kecil dan saat gerak
// dikurangi tidak ada animasi, sehingga panel langsung tampil dalam warna terbalik.
//
// Tinggi tiap langkah dipesan sejak awal: teks lengkap dirender tak terlihat di sel grid yang sama dengan
// teks yang sedang diketik, sehingga garis penghubung antarbulatan sudah sepanjang akhirnya dan tidak
// memanjang mengikuti ketikan.
export default function AlurKerjaAnimasi() {
  const t = useTeks();
  const judulPanel = t.auth.alurKerja.judulPanel;
  const langkah = useMemo(
    () => t.auth.alurKerja.langkah.map((l, i) => ({ nomor: ["I", "II", "III"][i] ?? String(i + 1), ...l })),
    [t.auth.alurKerja.langkah],
  );
  const [reduksi, setReduksi] = useState(false);
  const [selesai, setSelesai] = useState(false);

  const [judul, setJudul] = useState("");
  const [bulatTampil, setBulatTampil] = useState<boolean[]>([false, false, false]);
  const [bulatIsi, setBulatIsi] = useState<boolean[]>([false, false, false]);
  const [judulL, setJudulL] = useState<string[]>(["", "", ""]);
  const [uraianL, setUraianL] = useState<string[]>(["", "", ""]);
  const [aktif, setAktif] = useState(-1);

  useEffect(() => {
    const mulai = (): (() => void) => {
      let batal = false;
      const timers = new Set<ReturnType<typeof setTimeout>>();

      const tunggu = (ms: number) =>
        new Promise<void>((selesaiTunggu) => {
          const timer = setTimeout(() => {
            timers.delete(timer);
            selesaiTunggu();
          }, ms);
          timers.add(timer);
        });

      const tampak = () =>
        new Promise<void>((selesaiTunggu) => {
          if (!document.hidden) return selesaiTunggu();
          const saat = () => {
            if (document.hidden) return;
            document.removeEventListener("visibilitychange", saat);
            selesaiTunggu();
          };
          document.addEventListener("visibilitychange", saat);
        });

      const ketik = async (teks: string, isi: (s: string) => void) => {
        for (let i = 1; i <= teks.length; i++) {
          if (batal) return;
          isi(teks.slice(0, i));
          await tunggu(KECEPATAN_KETIK);
        }
      };

      function ubahLarik<T>(set: React.Dispatch<React.SetStateAction<T[]>>, i: number, nilai: T): void {
        set((lama) => lama.map((v, k) => (k === i ? nilai : v)));
      }

      const jalankan = async () => {
        await tampak();

        setSelesai(false);
        setJudul("");
        setBulatTampil([false, false, false]);
        setBulatIsi([false, false, false]);
        setJudulL(["", "", ""]);
        setUraianL(["", "", ""]);
        setAktif(-1);

        await tunggu(300);
        await ketik(judulPanel, setJudul);
        await tunggu(250);
        for (let i = 0; i < langkah.length; i++) {
          ubahLarik<boolean>(setBulatTampil, i, true);
          await tunggu(220);
        }
        await tunggu(350);
        for (let i = 0; i < langkah.length; i++) {
          if (batal) return;
          setAktif(i);
          ubahLarik<boolean>(setBulatIsi, i, true);
          await tunggu(380);
          await ketik(langkah[i].judul, (s) => ubahLarik(setJudulL, i, s));
          await ketik(langkah[i].uraian, (s) => ubahLarik(setUraianL, i, s));
          await tunggu(350);
        }
        if (batal) return;
        setAktif(-1);
        await tunggu(500);
        if (!batal) setSelesai(true);
      };

      jalankan();

      return () => {
        batal = true;
        timers.forEach(clearTimeout);
        timers.clear();
      };
    };

    const reduksiMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const lebarMq = window.matchMedia("(min-width: 1024px)");
    let berhenti: (() => void) | null = null;
    const sinkron = () => {
      setReduksi(reduksiMq.matches);
      const boleh = lebarMq.matches && !reduksiMq.matches;
      if (boleh && !berhenti) berhenti = mulai();
      if (!boleh) {
        berhenti?.();
        berhenti = null;
        setSelesai(false);
      }
    };
    sinkron();
    reduksiMq.addEventListener("change", sinkron);
    lebarMq.addEventListener("change", sinkron);
    return () => {
      berhenti?.();
      reduksiMq.removeEventListener("change", sinkron);
      lebarMq.removeEventListener("change", sinkron);
    };
  }, [langkah, judulPanel]);

  const kursor = (tampil: boolean) =>
    tampil ? <span aria-hidden="true" className="kursor-ketik" style={{ height: "0.9em", marginLeft: 1 }} /> : null;

  // Isi animasi (layar lebar). Dipakai dua kali: lapisan dasar dan lapisan terbalik yang disapukan.
  const isiAnimasi = (
    <>
      <div className="mb-4 h-4 font-sans text-sm font-medium leading-4 text-[var(--alur-teks)]">
        {judul}
        {kursor(judul.length > 0 && judul.length < judulPanel.length)}
      </div>
      <ol>
        {langkah.map((l, i) => {
          const terakhir = i === langkah.length - 1;
          const tampil = bulatTampil[i];
          const isi = bulatIsi[i];
          return (
            <li key={l.nomor} className={`relative flex items-start gap-3.5 ${terakhir ? "" : "pb-4"}`}>
              {!terakhir && (
                <span
                  aria-hidden="true"
                  className="alur-bulat absolute bg-[var(--alur-penghubung)]"
                  style={{
                    left: 12,
                    width: 3,
                    top: 30,
                    bottom: 2,
                    transform: tampil ? "scaleY(1)" : "scaleY(0)",
                    transformOrigin: "top",
                  }}
                />
              )}
              <span
                aria-hidden="true"
                className="alur-bulat relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--alur-teks)] font-mono text-[11px] font-semibold"
                style={{
                  opacity: tampil ? 1 : 0,
                  transform: tampil ? "scale(1)" : "scale(0.5)",
                  backgroundColor: isi ? "var(--alur-bulat-bg)" : "transparent",
                  color: isi ? "var(--alur-bulat-teks)" : "transparent",
                }}
              >
                {l.nomor}
              </span>
              <div className="min-w-0 flex-1">
                <div className="grid font-sans text-sm font-semibold leading-tight text-[var(--alur-teks)]">
                  <span aria-hidden="true" className="invisible col-start-1 row-start-1">{l.judul}</span>
                  <span className="col-start-1 row-start-1">
                    {judulL[i]}
                    {aktif === i && judulL[i].length < l.judul.length && kursor(isi)}
                  </span>
                </div>
                <div className="mt-1 grid text-xs leading-normal text-[var(--alur-teks)]/85">
                  <span aria-hidden="true" className="invisible col-start-1 row-start-1">{l.uraian}</span>
                  <span className="col-start-1 row-start-1">
                    {uraianL[i]}
                    {aktif === i && judulL[i].length === l.judul.length && uraianL[i].length < l.uraian.length && kursor(true)}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );

  return (
    <section
      aria-label={t.auth.alurKerja.labelBagian}
      data-selesai={selesai}
      data-statis={reduksi}
      className="alur-panel relative rounded border-t border-[var(--alur-garis)] bg-[var(--alur-bg)] px-5 py-6"
    >
      <div className={reduksi ? "" : "lg:hidden"}>
        <div className="mb-4 h-4 font-sans text-sm font-medium leading-4 text-[var(--alur-teks)]">{judulPanel}</div>
        <ol>
          {langkah.map((l, i) => (
            <li key={l.nomor} className={`relative flex items-start gap-3.5 ${i === langkah.length - 1 ? "" : "pb-4"}`}>
              {i < langkah.length - 1 && (
                <span aria-hidden="true" className="absolute bg-[var(--alur-penghubung)]" style={{ left: 12, width: 3, top: 30, bottom: 2 }} />
              )}
              <span
                aria-hidden="true"
                className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--alur-bulat-bg)] font-mono text-[11px] font-semibold text-[var(--alur-bulat-teks)]"
              >
                {l.nomor}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-sans text-sm font-semibold leading-tight text-[var(--alur-teks)]">{l.judul}</div>
                <span className="mt-1 block text-xs leading-normal text-[var(--alur-teks)]/85">{l.uraian}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className={reduksi ? "hidden" : "hidden lg:block"}>{isiAnimasi}</div>

      {selesai && !reduksi && (
        <div
          aria-hidden="true"
          inert
          className="alur-lapisan alur-terbalik pointer-events-none absolute inset-0 hidden rounded bg-[var(--alur-bg)] px-5 py-6 lg:block"
        >
          {isiAnimasi}
        </div>
      )}
    </section>
  );
}
