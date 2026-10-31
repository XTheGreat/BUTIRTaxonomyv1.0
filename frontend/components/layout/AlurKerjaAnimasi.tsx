"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { pecahToken } from "@/lib/texBertahap";
import { useTeks } from "@/lib/teks";

// KaTeX (JS + CSS) hanya dibutuhkan animasi rumus di layar lebar, jadi dimuat terpisah dan baru
// diminta saat animasi mulai berjalan, bukan bersama halaman Masuk.
const Rumus = dynamic(() => import("./RumusKatex"), { ssr: false });

const PERSAMAAN = [
  String.raw`i\hbar\frac{\partial}{\partial t}\Psi=\left[-\frac{\hbar^{2}}{2m}\nabla^{2}+V\right]\Psi`,
  String.raw`R_{\mu\nu}-\tfrac{1}{2}R\,g_{\mu\nu}+\Lambda g_{\mu\nu}=\frac{8\pi G}{c^{4}}T_{\mu\nu}`,
  String.raw`\nabla\times\mathbf{B}=\mu_0\mathbf{J}+\mu_0\varepsilon_0\frac{\partial\mathbf{E}}{\partial t}`,
  String.raw`\hat f(\xi)=\int_{-\infty}^{\infty}f(x)\,e^{-2\pi i x\xi}\,dx`,
  String.raw`\rho\left(\frac{\partial\mathbf{v}}{\partial t}+\mathbf{v}\cdot\nabla\mathbf{v}\right)=-\nabla p+\mu\nabla^{2}\mathbf{v}+\mathbf{f}`,
  String.raw`\int_{-\infty}^{\infty}e^{-x^{2}}dx=\sqrt{\pi},\qquad e^{i\pi}+1=0`,
  String.raw`\left(i\gamma^{\mu}\partial_{\mu}-m\right)\psi=0`,
  String.raw`\zeta(s)=\sum_{n=1}^{\infty}\frac{1}{n^{s}}=\prod_{p}\frac{1}{1-p^{-s}}`,
  String.raw`E^{2}=(pc)^{2}+(mc^{2})^{2}`,
  String.raw`\frac{\partial u}{\partial t}=\alpha\left(\frac{\partial^{2}u}{\partial x^{2}}+\frac{\partial^{2}u}{\partial y^{2}}\right)`,
];

type Fase = "alur" | "rumus" | "coba";

const KECEPATAN_KETIK = 22;
const KECEPATAN_RUMUS = 26;
const KECEPATAN_HAPUS = 45;
const URUTAN_KELUAR = ["alur-keluar-kiri", "alur-keluar-atas", "alur-keluar-kanan"];
const URUTAN_GILIRAN = [0, 2, 1];

function acak<T>(daftar: T[], n: number): T[] {
  const salinan = [...daftar];
  for (let i = salinan.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [salinan[i], salinan[j]] = [salinan[j], salinan[i]];
  }
  return salinan.slice(0, n);
}

export default function AlurKerjaAnimasi() {
  const t = useTeks();
  const judulPanel = t.auth.alurKerja.judulPanel;
  const frasaCoba = t.auth.alurKerja.frasaCoba;
  const langkah = useMemo(
    () => t.auth.alurKerja.langkah.map((l, i) => ({ nomor: ["I", "II", "III"][i] ?? String(i + 1), ...l })),
    [t.auth.alurKerja.langkah],
  );
  const [fase, setFase] = useState<Fase>("alur");
  const [pudar, setPudar] = useState(false);
  const [reduksi, setReduksi] = useState(false);

  const [judul, setJudul] = useState("");
  const [bulatTampil, setBulatTampil] = useState<boolean[]>([false, false, false]);
  const [bulatIsi, setBulatIsi] = useState<boolean[]>([false, false, false]);
  const [judulL, setJudulL] = useState<string[]>(["", "", ""]);
  const [uraianL, setUraianL] = useState<string[]>(["", "", ""]);
  const [aktif, setAktif] = useState(-1);

  const [persamaan, setPersamaan] = useState<{ tex: string; jumlah: number }[]>([]);
  const [keluar, setKeluar] = useState(0);
  const [kata, setKata] = useState("");

  useEffect(() => {
    const mulai = (): (() => void) => {
    void import("./RumusKatex");
    let batal = false;
    const timers = new Set<ReturnType<typeof setTimeout>>();

    const tunggu = (ms: number) =>
      new Promise<void>((selesai) => {
        const t = setTimeout(() => {
          timers.delete(t);
          selesai();
        }, ms);
        timers.add(t);
      });

    const tampak = () =>
      new Promise<void>((selesai) => {
        if (!document.hidden) return selesai();
        const saat = () => {
          if (document.hidden) return;
          document.removeEventListener("visibilitychange", saat);
          selesai();
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

    const hapus = async (teks: string, isi: (s: string) => void) => {
      for (let i = teks.length - 1; i >= 0; i--) {
        if (batal) return;
        isi(teks.slice(0, i));
        await tunggu(KECEPATAN_HAPUS);
      }
    };

    function ubahLarik<T>(set: React.Dispatch<React.SetStateAction<T[]>>, i: number, nilai: T): void {
      set((lama) => lama.map((v, k) => (k === i ? nilai : v)));
    }

    const ulangSlideAlur = () => {
      setJudul("");
      setBulatTampil([false, false, false]);
      setBulatIsi([false, false, false]);
      setJudulL(["", "", ""]);
      setUraianL(["", "", ""]);
      setAktif(-1);
    };

    const jalankan = async () => {
      while (!batal) {
        await tampak();

        ulangSlideAlur();
        setPudar(false);
        setFase("alur");
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
        setAktif(-1);
        await tunggu(2200);
        setPudar(true);
        await tunggu(1100);

        setPudar(false);
        setKeluar(0);
        setPersamaan([]);
        setFase("rumus");
        const pilihan = acak(PERSAMAAN, 3);
        for (let r = 0; r < pilihan.length; r++) {
          const jumlahToken = pecahToken(pilihan[r]).length;
          setPersamaan((lama) => [...lama, { tex: pilihan[r], jumlah: 0 }]);
          for (let n = 1; n <= jumlahToken; n++) {
            if (batal) return;
            setPersamaan((lama) => lama.map((p, k) => (k === r ? { ...p, jumlah: n } : p)));
            await tunggu(KECEPATAN_RUMUS);
          }
          await tunggu(300);
        }
        await tunggu(2200);
        for (let k = 1; k <= URUTAN_KELUAR.length; k++) {
          if (batal) return;
          setKeluar(k);
          await tunggu(650);
        }
        await tunggu(250);

        setPersamaan([]);
        setKeluar(0);
        setFase("coba");
        for (const frasa of frasaCoba) {
          if (batal) return;
          setKata("");
          await tunggu(300);
          await ketik(frasa, setKata);
          await tunggu(1300);
          await hapus(frasa, setKata);
          await tunggu(250);
        }
      }
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
      if (!boleh && berhenti) {
        berhenti();
        berhenti = null;
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
  }, [langkah, judulPanel, frasaCoba]);


    const kursor = (tampil: boolean) =>
    tampil ? <span aria-hidden="true" className="kursor-ketik" style={{ height: "0.9em", marginLeft: 1 }} /> : null;

  return (
    // Tinggi dikunci di layar lebar: tiap fase (alur, rumus, kata) beda tingginya dan rumus
    // bertambah satu per satu, sehingga tanpa ini ilustrasi kerucut/bola di bawahnya ikut bergeser.
    <section
      aria-label={t.auth.alurKerja.labelBagian}
      className={`alur-panel border-t border-[var(--accent)]/20 pt-8 ${reduksi ? "" : "lg:h-72 lg:overflow-hidden"}`}
    >
      <div className={reduksi ? "" : "lg:hidden"}>
        <div className="mb-4 h-4 font-sans text-sm font-medium leading-4 text-[var(--accent-text)]">{judulPanel}</div>
        <ol>
          {langkah.map((l, i) => (
            <li key={l.nomor} className={`relative flex items-start gap-3.5 ${i === langkah.length - 1 ? "" : "pb-4"}`}>
              {i < langkah.length - 1 && (
                <span aria-hidden="true" className="absolute bg-[var(--accent)]/40" style={{ left: 12, width: 3, top: 30, bottom: 2 }} />
              )}
              <span
                aria-hidden="true"
                className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] font-mono text-[11px] font-semibold text-[var(--ink-on-accent)]"
              >
                {l.nomor}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-sans text-sm font-semibold leading-tight text-[var(--accent-text)]">{l.judul}</div>
                <span className="mt-1 block text-xs leading-normal text-[var(--accent-text)]/85">{l.uraian}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className={reduksi ? "hidden" : "hidden h-full lg:block"}>
      {fase === "alur" && (
        <div className={pudar ? "alur-pudar" : ""}>
          <div className="mb-4 h-4 font-sans text-sm font-medium leading-4 text-[var(--accent-text)]">
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
                      className="alur-bulat absolute bg-[var(--accent)]/40"
                      style={{ left: 12, width: 3, top: 30, bottom: 2, opacity: tampil ? 1 : 0 }}
                    />
                  )}
                  <span
                    aria-hidden="true"
                    className="alur-bulat relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--accent)] font-mono text-[11px] font-semibold"
                    style={{
                      opacity: tampil ? 1 : 0,
                      transform: tampil ? "scale(1)" : "scale(0.5)",
                      backgroundColor: isi ? "var(--accent)" : "transparent",
                      color: isi ? "#fff" : "transparent",
                    }}
                  >
                    {l.nomor}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="min-h-5 font-sans text-sm font-semibold leading-tight text-[var(--accent-text)]">
                      {judulL[i]}
                      {aktif === i && judulL[i].length < l.judul.length && kursor(isi)}
                    </div>
                    <span className="mt-1 block min-h-4 text-xs leading-normal text-[var(--accent-text)]/85">
                      {uraianL[i]}
                      {aktif === i && judulL[i].length === l.judul.length && uraianL[i].length < l.uraian.length && kursor(true)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {fase === "rumus" && (
        <div className="flex h-full flex-col justify-start gap-3 overflow-hidden text-[var(--accent-text)]">
          {persamaan.map((p, i) => (
            <div
              key={i}
              className={`overflow-hidden whitespace-nowrap text-sm ${URUTAN_GILIRAN.indexOf(i) < keluar ? URUTAN_KELUAR[i] : ""}`}
              style={{ minHeight: 40 }}
            >
              <Rumus tex={p.tex} jumlah={p.jumlah} />
            </div>
          ))}
        </div>
      )}

      {fase === "coba" && (
        <div className="flex h-full items-center justify-center">
          <p className="font-serif text-4xl font-normal text-[var(--accent-text)]">
            {kata}
            {kursor(true)}
          </p>
        </div>
      )}
      </div>
    </section>
  );
}
