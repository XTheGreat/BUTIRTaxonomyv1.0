"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import AuthShell from "@/components/layout/AuthShell";
import MasukGuru from "./MasukGuru";
import { useTeks } from "@/lib/teks";

type Peran = "guru" | "siswa";

const DAFTAR_PERAN: Peran[] = ["guru", "siswa"];

export default function LoginForm({ awal }: { awal: Peran }) {
  const router = useRouter();
  const t = useTeks();
  const l = t.auth.login;
  const [peran, setPeran] = useState<Peran>(awal);
  const [kode, setKode] = useState("");
  const [error, setError] = useState("");

  const emailRef = useRef<HTMLInputElement>(null);
  const kodeRef = useRef<HTMLInputElement>(null);
  const peranSebelumnya = useRef(peran);

  const siswa = peran === "siswa";

  useEffect(() => {
    if (peranSebelumnya.current === peran) return;
    peranSebelumnya.current = peran;
    (peran === "siswa" ? kodeRef : emailRef).current?.focus({ preventScroll: true });
  }, [peran]);

  function pilihPeran(baru: Peran) {
    setError("");
    setPeran(baru);
  }

  function handleTabKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      pilihPeran(siswa ? "guru" : "siswa");
    }
  }

  function handleMasukSiswa(e: React.FormEvent) {
    e.preventDefault();
    const bersih = kode.trim().toUpperCase();
    if (!bersih) {
      setError(l.siswa.kodeKosong);
      return;
    }
    setError("");
    router.push(`/akses-ujian/${encodeURIComponent(bersih)}`);
  }

  const panel = (aktif: boolean, arah: 1 | -1) =>
    `col-start-1 row-start-1 transition-[opacity,translate] duration-200 ease-out ${
      aktif
        ? "opacity-100 translate-x-0"
        : `opacity-0 pointer-events-none ${arah === 1 ? "translate-x-6" : "-translate-x-6"}`
    }`;

  return (
    <AuthShell
      denganFooterSitus
      kartuTerbalik={siswa}
      title={siswa ? l.siswa.judul : l.guru.judul}
      subtitle={
        siswa
          ? l.siswa.subjudul
          : l.guru.subjudul
      }
      footer={
        siswa ? (
          <span>{l.siswa.catatan}</span>
        ) : (
          <div className="space-y-1.5">
            <div>
              {l.guru.belumPunyaAkun}{" "}
              <Link
                href="/register"
                className="text-[var(--accent-text)] hover:underline font-medium"
              >
                {l.guru.daftarBaru}
              </Link>
            </div>
            <div>
              <Link
                href="/reset-password"
                className="inline-block py-1.5 text-[var(--ink-muted)] hover:text-[var(--ink)] hover:underline"
              >
                {l.guru.lupaPassword}
              </Link>
            </div>
          </div>
        )
      }
    >
      <div
        role="tablist"
        aria-label={l.labelPeran}
        onKeyDown={handleTabKey}
        className={`relative mb-6 grid grid-cols-2 overflow-hidden rounded border transition-colors duration-300 ease-out ${
          siswa
            ? "border-white/70 bg-[#0C4D53]"
            : "border-[var(--line-strong)] bg-[var(--surface)]"
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute inset-y-0 left-0 w-1/2 transition-[transform,background-color] duration-[280ms] ease-out ${siswa ? "bg-white" : "bg-[var(--accent)]"}`}
          style={{
            transform: siswa ? "translateX(100%)" : "translateX(0)",
          }}
        />
        <span
          aria-hidden="true"
          className={`absolute inset-y-0 left-1/2 z-[1] w-px -translate-x-1/2 ${siswa ? "bg-white/70" : "bg-[var(--line-strong)]"}`}
        />
        {DAFTAR_PERAN.map((p) => {
          const aktif = peran === p;
          return (
            <button
              key={p}
              type="button"
              role="tab"
              id={`tab-${p}`}
              aria-selected={aktif}
              aria-controls={`panel-${p}`}
              tabIndex={aktif ? 0 : -1}
              onClick={() => pilihPeran(p)}
              className={`relative z-[2] py-2.5 text-sm font-medium transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70 ${
                siswa
                  ? aktif
                    ? "text-[var(--accent-on-light)]"
                    : "text-white/85 hover:text-white"
                  : aktif
                    ? "text-[var(--ink-on-accent)]"
                    : "text-[var(--ink)] hover:text-[var(--accent-text)]"
              }`}
            >
              {l.peran[p]}
            </button>
          );
        })}
      </div>

      <div className="grid overflow-hidden -mx-1 px-1">
        <div
          role="tabpanel"
          id="panel-guru"
          aria-labelledby="tab-guru"
          aria-hidden={siswa}
          inert={siswa}
          className={panel(!siswa, -1)}
        >
          <MasukGuru emailRef={emailRef} />
        </div>

        <div
          role="tabpanel"
          id="panel-siswa"
          aria-labelledby="tab-siswa"
          aria-hidden={!siswa}
          inert={!siswa}
          className={`self-start ${panel(siswa, 1)}`}
        >
          <form onSubmit={handleMasukSiswa} className="flex flex-col gap-4">
            <Input
              ref={kodeRef}
              label={l.siswa.labelKode}
              value={kode}
              onChange={(e) => setKode(e.target.value.toUpperCase())}
              placeholder="A1B2C3D4"
              helper={l.siswa.bantuanKode}
              labelClassName={siswa ? "!text-[var(--ink-on-accent)]" : ""}
              helperClassName={siswa ? "!text-[var(--ink-on-accent)]/80" : ""}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className={`font-mono tracking-[0.2em] ${
                siswa ? "!border-white !bg-white !text-[var(--ink)]" : ""
              }`}
            />
            {error && siswa && (
              <div className="bg-[var(--status-ditolak-bg)] p-2.5 text-xs leading-relaxed text-[var(--status-ditolak)]">
                {error}
              </div>
            )}
            <Button
              type="submit"
              disabled={!kode.trim()}
              className={`mt-2 w-full ${
                siswa
                  ? "!border-white !bg-white !text-[var(--accent-on-light)] hover:!bg-[var(--accent-soft-on-light)] disabled:!opacity-60"
                  : ""
              }`}
            >
              {l.siswa.lanjutkan}
            </Button>
          </form>
        </div>
      </div>
    </AuthShell>
  );
}
