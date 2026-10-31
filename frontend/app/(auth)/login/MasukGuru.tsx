"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FcGoogle } from "react-icons/fc";
import { Eye, EyeOff } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { saveToken, saveUser } from "@/lib/auth";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import TombolGoogle from "@/components/auth/TombolGoogle";
import { useTeks } from "@/lib/teks";

const KODE_EMAIL_AKTIF = false;

// Client ID Google tidak rahasia. Bila diisi saat build, halaman Masuk tidak perlu menanyakannya ke
// backend: satu permintaan lintas-origin (plus preflight) lebih sedikit saat halaman dibuka, dan tidak
// ada galat jaringan di konsol bila backend sedang mati. String kosong = Google dinonaktifkan.
const ID_GOOGLE_BUILD = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

type Langkah = "sandi" | "kode";

const tautan =
  "text-[var(--accent-text)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)]";

export default function MasukGuru({ emailRef }: { emailRef: React.RefObject<HTMLInputElement | null> }) {
  const router = useRouter();
  const t = useTeks();
  const m = t.auth.masukGuru;
  const [googleClientId, setGoogleClientId] = useState<string | null>(ID_GOOGLE_BUILD ?? null);
  const [langkah, setLangkah] = useState<Langkah>("sandi");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tampilkanPassword, setTampilkanPassword] = useState(false);
  const [kode, setKode] = useState("");
  const [galat, setGalat] = useState("");
  const [info, setInfo] = useState("");
  const [sibuk, setSibuk] = useState(false);

  useEffect(() => {
    if (ID_GOOGLE_BUILD !== undefined) return;
    apiFetch("/api/auth/metode")
      .then((m) => setGoogleClientId(m.google_client_id || ""))
      .catch(() => setGoogleClientId(""));
  }, []);

  function selesai(data: { access_token: string; user: any }) {
    saveToken(data.access_token);
    saveUser(data.user);
    router.push("/dashboard");
  }

  async function jalankan(aksi: () => Promise<void>, pesanGalat: string) {
    setGalat("");
    setSibuk(true);
    try {
      await aksi();
    } catch (err: any) {
      setGalat(err.message || pesanGalat);
    } finally {
      setSibuk(false);
    }
  }

  function masukSandi(e: React.FormEvent) {
    e.preventDefault();
    return jalankan(async () => {
      selesai(await apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }));
    }, m.gagalMasuk);
  }

  function masukGoogle(credential: string) {
    return jalankan(async () => {
      selesai(await apiFetch("/api/auth/google", { method: "POST", body: JSON.stringify({ credential }) }));
    }, m.googleGagal);
  }

  function kirimKode(e?: React.FormEvent) {
    e?.preventDefault();
    return jalankan(async () => {
      await apiFetch("/api/auth/kode/minta", { method: "POST", body: JSON.stringify({ email }) });
      setInfo(m.kodeTerkirim(email.trim()));
      setKode("");
      setLangkah("kode");
    }, m.gagalKirimKode);
  }

  function verifikasiKode(e: React.FormEvent) {
    e.preventDefault();
    return jalankan(async () => {
      selesai(await apiFetch("/api/auth/kode/verifikasi", { method: "POST", body: JSON.stringify({ email, kode }) }));
    }, m.kodeSalah);
  }

  const kotakGalat = galat && (
    <div role="alert" className="p-2.5 text-xs leading-relaxed text-[var(--status-ditolak)]">
      {galat}
    </div>
  );

  if (langkah === "kode") {
    return (
      <form onSubmit={verifikasiKode} className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-[var(--ink-muted)]">{info}</p>
        <Input
          label={m.labelKode}
          value={kode}
          onChange={(e) => setKode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="123456"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          required
          className="font-mono text-lg tracking-[0.4em] tabular-nums"
        />
        {kotakGalat}
        <Button type="submit" disabled={sibuk || kode.length !== 6} className="w-full">
          {sibuk ? m.memverifikasi : m.masuk}
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <button type="button" onClick={() => setLangkah("sandi")} className={tautan}>
            {m.kembali}
          </button>
          <button type="button" disabled={sibuk} onClick={() => kirimKode()} className={tautan}>
            {m.kirimUlang}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {googleClientId ? (
        <TombolGoogle clientId={googleClientId} onCredential={masukGoogle} onGagal={setGalat} />
      ) : (
        <button
          type="button"
          disabled={googleClientId === null}
          onClick={() => setGalat(m.googleBelumAktif)}
          className="flex w-full items-center justify-center gap-3 rounded border border-[var(--line-strong)] bg-[var(--canvas)] px-3.5 py-2 text-sm font-medium text-[var(--ink)] transition-colors duration-[140ms] hover:border-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)] disabled:opacity-40"
        >
          <FcGoogle size={20} aria-hidden="true" />
          {m.lanjutkanGoogle}
        </button>
      )}

      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-[var(--line-strong)]" />
        <span className="font-mono text-[11px] uppercase text-[var(--ink-muted)]">{m.atau}</span>
        <span className="h-px flex-1 bg-[var(--line-strong)]" />
      </div>

      <form onSubmit={masukSandi} className="flex flex-col gap-4">
        <Input
          ref={emailRef}
          label={m.email}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={m.emailContoh}
          autoComplete="email"
          required
        />
        <Input
          label={m.kataSandi}
          type={tampilkanPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          required
          endAdornment={
            <button
              type="button"
              aria-label={tampilkanPassword ? m.sembunyikanKataSandi : m.tampilkanKataSandi}
              aria-pressed={tampilkanPassword}
              title={tampilkanPassword ? m.sembunyikanKataSandi : m.tampilkanKataSandi}
              onClick={() => setTampilkanPassword((terlihat) => !terlihat)}
              onMouseDown={(event) => event.preventDefault()}
              className="rounded p-1 text-[var(--ink-muted)] transition-colors duration-[140ms] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)]"
            >
              {tampilkanPassword ? (
                <EyeOff aria-hidden="true" size={16} strokeWidth={1.75} />
              ) : (
                <Eye aria-hidden="true" size={16} strokeWidth={1.75} />
              )}
            </button>
          }
        />
        {kotakGalat}
        <Button type="submit" disabled={sibuk} className="w-full">
          {sibuk ? m.memverifikasi : m.masuk}
        </Button>
      </form>

      {KODE_EMAIL_AKTIF && (
        <button type="button" disabled={sibuk || !email.trim()} onClick={() => kirimKode()} className={`${tautan} self-start text-xs`}>
          {m.masukDenganKode}
        </button>
      )}
    </div>
  );
}
