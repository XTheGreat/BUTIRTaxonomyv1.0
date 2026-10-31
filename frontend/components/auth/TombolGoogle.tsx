"use client";

import { useEffect, useRef, useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { useBahasa, useTeks } from "@/lib/teks";

// Skrip Google (~100 KB) tidak dimuat bersama halaman: sampai ada interaksi pertama, atau setelah
// jeda ini, yang tampil adalah tombol pengganti yang tampilannya sama.
const JEDA_MUAT_MS = 10000;

const SKRIP = "https://accounts.google.com/gsi/client";

type GoogleWindow = Window & {
  google?: {
    accounts: {
      id: {
        initialize: (opsi: { client_id: string; callback: (r: { credential: string }) => void }) => void;
        renderButton: (el: HTMLElement, opsi: Record<string, unknown>) => void;
      };
    };
  };
};

function muatSkrip(pesanGagal: string): Promise<void> {
  return new Promise((selesai, gagal) => {
    if ((window as GoogleWindow).google?.accounts) return selesai();
    const ada = document.querySelector<HTMLScriptElement>(`script[src="${SKRIP}"]`);
    const skrip = ada ?? document.createElement("script");
    skrip.addEventListener("load", () => selesai());
    skrip.addEventListener("error", () => gagal(new Error(pesanGagal)));
    if (!ada) {
      skrip.src = SKRIP;
      skrip.async = true;
      document.head.appendChild(skrip);
    }
  });
}

export default function TombolGoogle({
  clientId,
  onCredential,
  onGagal,
}: {
  clientId: string;
  onCredential: (credential: string) => void;
  onGagal: (pesan: string) => void;
}) {
  const t = useTeks();
  const { bahasa } = useBahasa();
  const pesanSkripGagal = t.auth.tombolGoogle.skripGagal;
  const pesanTidakDapatDimuat = t.auth.tombolGoogle.tidakDapatDimuat;
  const wadah = useRef<HTMLDivElement>(null);
  const callback = useRef(onCredential);
  const gagalRef = useRef(onGagal);
  const [mulaiMuat, setMulaiMuat] = useState(false);
  const [siap, setSiap] = useState(false);

  useEffect(() => {
    callback.current = onCredential;
    gagalRef.current = onGagal;
  });

  useEffect(() => {
    if (mulaiMuat) return;
    const mulai = () => setMulaiMuat(true);
    const peristiwa = ["pointerdown", "keydown", "touchstart", "scroll"] as const;
    const timer = window.setTimeout(mulai, JEDA_MUAT_MS);
    peristiwa.forEach((p) => window.addEventListener(p, mulai, { once: true, passive: true }));
    return () => {
      window.clearTimeout(timer);
      peristiwa.forEach((p) => window.removeEventListener(p, mulai));
    };
  }, [mulaiMuat]);

  useEffect(() => {
    if (!mulaiMuat) return;
    let aktif = true;
    muatSkrip(pesanSkripGagal)
      .then(() => {
        const g = (window as GoogleWindow).google;
        if (!aktif || !g || !wadah.current) return;
        g.accounts.id.initialize({ client_id: clientId, callback: (r) => callback.current(r.credential) });
        g.accounts.id.renderButton(wadah.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "left",
          locale: bahasa,
          width: Math.min(400, Math.max(200, wadah.current.clientWidth || 320)),
        });
        setSiap(true);
      })
      .catch(() => aktif && gagalRef.current(pesanTidakDapatDimuat));
    return () => {
      aktif = false;
    };
  }, [mulaiMuat, clientId, bahasa, pesanSkripGagal, pesanTidakDapatDimuat]);

  return (
    <>
      {!siap && (
        <button
          type="button"
          onClick={() => setMulaiMuat(true)}
          aria-busy={mulaiMuat}
          className="flex w-full items-center justify-center gap-3 rounded border border-[var(--line-strong)] bg-[var(--canvas)] px-3.5 py-2 text-sm font-medium text-[var(--ink)] transition-colors duration-[140ms] hover:border-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)]"
        >
          <FcGoogle size={20} aria-hidden="true" />
          {t.auth.masukGuru.lanjutkanGoogle}
        </button>
      )}
      <div ref={wadah} className={siap ? "flex min-h-[44px] w-full justify-center" : "h-0 w-full overflow-hidden"} />
    </>
  );
}
