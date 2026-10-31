"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import FooterSitus from "./FooterSitus";
import AlurKerjaAnimasi from "./AlurKerjaAnimasi";
import PemilihBahasa from "./PemilihBahasa";
import LatarPerpustakaan from "./LatarPerpustakaan";
import BannerAuth from "./BannerAuth";
import { useTeks } from "@/lib/teks";

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  denganFooterSitus?: boolean;
  kartuTerbalik?: boolean;
}

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
  denganFooterSitus = false,
  kartuTerbalik = false,
}: AuthShellProps) {
  const t = useTeks();
  return (
    <div className="min-h-screen bg-[var(--canvas)] flex flex-col text-[var(--ink)]">
      <div className="flex min-h-screen flex-col lg:flex-row">
      
      <div className="lg:w-[480px] xl:w-[540px] shrink-0 relative overflow-hidden order-2 lg:order-1 bg-[var(--accent)] p-8 lg:p-14 flex flex-col justify-between text-[var(--ink-on-accent)]">
        <BannerAuth />
        <div className="relative">
          <div className="mb-10">
            <Link href="/" className="inline-block focus-visible:outline-none">
              <Image
                src="/ButirLogoPutih.png"
                width={552}
                height={109}
                preload
                fetchPriority="high"
                sizes="(min-width: 1024px) 360px, 80vw"
                alt="BUTIR"
                className="h-auto w-full max-w-[360px]"
              />
            </Link>
          </div>

          <p className="text-sm text-[var(--ink-on-accent)] leading-relaxed mb-10 max-w-sm">
            {t.auth.shell.deskripsi}
          </p>

          <AlurKerjaAnimasi />
        </div>

        <div className="relative text-[11px] text-[var(--ink-on-accent)]/80 font-mono pt-8 border-t border-[var(--ink-on-accent)]/25 mt-8 lg:mt-0">
          {t.auth.shell.standar}
        </div>
      </div>

      <div className="relative order-1 lg:order-2 flex-1 flex items-center justify-center overflow-hidden bg-[color-mix(in_srgb,var(--accent)_18%,var(--canvas))] p-6 sm:p-10">
        <LatarPerpustakaan />
        <PemilihBahasa className="absolute right-4 top-4 z-10" />

        <div className="relative w-full max-w-[420px]">
          <div
            className={`overflow-hidden rounded-md border transition-colors duration-300 ease-out ${
              kartuTerbalik
                ? "border-[var(--accent)] bg-[var(--accent)]"
                : "border-[var(--line-strong)] bg-[var(--canvas)]"
            }`}
          >
            <div className="px-8 pt-7 pb-8">
              <div className="mb-6">
                <h1 className={`font-serif text-2xl font-normal tracking-tight transition-colors duration-300 ${kartuTerbalik ? "text-[var(--ink-on-accent)]" : "text-[var(--ink)]"}`}>
                  {title}
                </h1>
                {subtitle && (
                  <p className={`mt-1.5 text-xs leading-relaxed transition-colors duration-300 ${kartuTerbalik ? "text-[var(--ink-on-accent)]/80" : "text-[var(--ink-muted)]"}`}>
                    {subtitle}
                  </p>
                )}
              </div>

              {children}

              {footer && (
                <div className={`mt-8 border-t pt-4 text-center text-xs transition-colors duration-300 ${kartuTerbalik ? "border-[var(--ink-on-accent)]/35 text-[var(--ink-on-accent)]/85" : "border-[var(--line)] text-[var(--ink-muted)]"}`}>
                  {footer}
                </div>
              )}
            </div>
          </div>

          {/* <div className="mt-4 text-center">
            <p className="inline-block rounded border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 font-mono text-[10px] leading-relaxed text-[var(--ink-muted)]">
              Sesi berakhir otomatis dan dapat dicabut dari server.
            </p>
          </div> */}
        </div>
      </div>
      </div>
      {denganFooterSitus && <FooterSitus />}
    </div>
  );
}
