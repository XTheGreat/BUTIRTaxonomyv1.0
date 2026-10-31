import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail } from "lucide-react";
import { SiInstagram, SiTiktok, SiYoutube } from "react-icons/si";
import { SITUS } from "@/lib/situs";
import { useTeks } from "@/lib/teks";
import FaktaUnikBerjalan from "./FaktaUnikBerjalan";

function TombolSosial({ href, label, warna, children }: { href: string; label: string; warna: string; children: React.ReactNode }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target={href.startsWith("mailto:") ? undefined : "_blank"}
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      style={{ color: warna }}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-white bg-white transition-opacity duration-[140ms] hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0C525A]"
    >
      {children}
    </a>
  );
}

function Kolom({ judul, tautan }: { judul: string; tautan: { label: string; href: string }[] }) {
  return (
    <nav aria-label={judul}>
      <h2 className="inline-block border-b border-white/40 pb-1.5 font-serif text-base font-medium text-white">{judul}</h2>
      <ul className="mt-3">
        {tautan.map((t) => (
          <li key={t.href}>
            <Link
              href={t.href}
              className="inline-block py-1.5 font-sans text-sm text-white/80 underline-offset-4 transition-colors duration-[140ms] hover:text-white hover:underline"
            >
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function FooterSitus() {
  const t = useTeks();
  const f = t.shell.footer;
  const { instagram, tiktok, youtube, email } = SITUS.sosial;
  const adaSosial = Boolean(instagram || tiktok || youtube || email);

  return (
    <>
    <section className="relative h-36 sm:h-40 border-t border-[var(--line)] bg-[var(--canvas)] overflow-hidden">
      <FaktaUnikBerjalan />
    </section>
    <footer className="bg-[linear-gradient(to_bottom,#0F5F66_0%,#0C525A_50%,#08444A_100%)] text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-8 py-14 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] lg:gap-16 lg:px-12">
        <div className="sm:col-span-2 lg:col-span-1">
          <Image
            src="/ButirLogoPutih.png"
            width={552}
            height={109}
            sizes="340px"
            alt={SITUS.nama}
            className="h-auto w-full max-w-[340px]"
          />
          <p className="mt-3 max-w-sm font-sans text-sm leading-relaxed text-white/80">{f.deskripsi}</p>
          <dl className="mt-5 space-y-1 font-sans text-sm text-white/80">
            <div className="flex gap-2">
              <dt className="text-white/60">{f.layanan}</dt>
              <dd>{f.jamLayanan}</dd>
            </div>
            {email && (
              <div className="flex items-center gap-2">
                <dt className="text-white/60">{f.email}</dt>
                <dd>
                  <a href={`mailto:${email}`} className="inline-block py-1.5 underline-offset-4 hover:text-white hover:underline">{email}</a>
                </dd>
              </div>
            )}
          </dl>
          {adaSosial && (
            <div className="mt-6 flex items-center gap-2.5">
              <TombolSosial href={instagram} label={f.instagram} warna="#E4405F">
                <SiInstagram size={18} aria-hidden="true" />
              </TombolSosial>
              <TombolSosial href={tiktok} label={f.tiktok} warna="#000000">
                <SiTiktok size={18} aria-hidden="true" />
              </TombolSosial>
              <TombolSosial href={youtube} label={f.youtube} warna="#FF0000">
                <SiYoutube size={18} aria-hidden="true" />
              </TombolSosial>
              <TombolSosial href={email ? `mailto:${email}` : ""} label={f.kirimEmail} warna="#0F5F66">
                <Mail size={18} strokeWidth={1.8} aria-hidden="true" />
              </TombolSosial>
            </div>
          )}
        </div>
        <Kolom
          judul={f.kolom.tentang}
          tautan={[
            { label: f.tautan.tentang, href: "/tentang" },
            { label: f.tautan.panduan, href: "/panduan" },
          ]}
        />
        <Kolom
          judul={f.kolom.akses}
          tautan={[
            { label: f.tautan.masukGuru, href: "/login" },
            { label: f.tautan.daftar, href: "/register" },
            { label: f.tautan.aksesUjian, href: "/akses-ujian" },
            { label: f.tautan.lupaPassword, href: "/reset-password" },
          ]}
        />
        <Kolom
          judul={f.kolom.legal}
          tautan={[
            { label: f.tautan.privasi, href: "/privasi" },
            { label: f.tautan.syarat, href: "/syarat" },
          ]}
        />
      </div>
      <div className="border-t border-white/15 px-8 py-5 text-center font-mono text-[11px] text-white/70">
        {f.hakCipta(SITUS.tahun, SITUS.nama)}
      </div>
    </footer>
    </>
  );
}
