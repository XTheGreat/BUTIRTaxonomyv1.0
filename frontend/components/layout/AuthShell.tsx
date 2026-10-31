"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import LatarLabirin from "./LatarLabirin";
import FooterSitus from "./FooterSitus";
import AlurKerjaAnimasi from "./AlurKerjaAnimasi";
import PemilihBahasa from "./PemilihBahasa";
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
      
      <div className="lg:w-[480px] xl:w-[540px] shrink-0 order-2 lg:order-1 bg-[var(--canvas)] border-t lg:border-t-0 lg:border-r border-[var(--line-strong)] p-8 lg:p-14 flex flex-col justify-between text-[var(--accent-text)]">
        <div>
          <div className="mb-10">
            <Link href="/" className="inline-block focus-visible:outline-none">
              <Image
                src="/ButirLogoSidebar.png"
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

          <p className="text-sm text-[var(--accent-text)] leading-relaxed mb-10 max-w-sm">
            {t.auth.shell.deskripsi}
          </p>

          <AlurKerjaAnimasi />
        </div>

        <div className="hidden lg:flex items-end my-6 self-center">
        <svg
          aria-hidden="true"
          viewBox="180 290 920 960"
          className="relative w-[208px] xl:w-[224px] h-auto shrink-0"
        >
          <defs>
            <linearGradient id="auth-kerucut" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#B4EBDF" />
              <stop offset="0.45" stopColor="#6CC7BB" />
              <stop offset="1" stopColor="#2B8A88" />
            </linearGradient>
            <linearGradient id="auth-kerucut-gelap" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#073E44" stopOpacity="0.55" />
              <stop offset="0.45" stopColor="#0B4F56" stopOpacity="0.25" />
              <stop offset="1" stopColor="#0F5F66" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g transform="translate(0,1280) scale(0.1,-0.1)" stroke="none">
            <path id="auth-bentuk-kerucut" d="M6380 9807 c-9 -18 -58 -111 -109 -207 -52 -96 -109 -202 -126 -235 -18 -33 -65 -121 -105 -195 -40 -74 -107 -200 -150 -280 -43 -80 -107 -199 -142 -265 -91 -168 -217 -405 -271 -505 -24 -47 -74 -139 -109 -205 -131 -242 -309 -575 -408 -760 -99 -185 -277 -518 -408 -760 -35 -66 -85 -158 -109 -205 -25 -47 -62 -116 -83 -155 -21 -38 -55 -101 -75 -140 -21 -38 -71 -133 -113 -210 -41 -77 -105 -196 -142 -265 -37 -69 -102 -190 -145 -270 -43 -80 -94 -176 -115 -215 -99 -185 -277 -518 -408 -760 -35 -66 -85 -158 -109 -205 -25 -47 -70 -131 -99 -187 -54 -100 -115 -255 -128 -323 -3 -19 -9 -46 -12 -60 -12 -50 -23 -237 -18 -315 16 -293 154 -586 412 -874 191 -214 493 -429 830 -592 78 -38 145 -69 148 -69 3 0 24 -8 47 -18 39 -17 59 -25 165 -67 217 -85 613 -186 927 -235 639 -100 1241 -92 1900 25 88 16 222 46 380 86 80 20 330 98 395 123 75 29 127 50 167 68 23 10 45 18 48 18 19 0 308 149 420 217 129 78 307 207 417 302 70 61 227 236 288 321 156 220 252 473 265 700 4 81 -7 256 -19 310 -3 14 -9 41 -12 60 -13 68 -74 223 -128 323 -29 56 -74 140 -99 187 -24 47 -74 139 -109 205 -131 242 -309 575 -408 760 -21 39 -72 135 -115 215 -43 80 -108 201 -145 270 -37 69 -101 188 -142 265 -42 77 -92 172 -113 210 -20 39 -54 102 -75 140 -21 39 -58 108 -83 155 -24 47 -74 139 -109 205 -129 239 -304 565 -408 760 -21 39 -70 131 -110 205 -40 74 -107 200 -150 280 -43 80 -108 201 -145 270 -37 69 -88 163 -112 210 -54 100 -180 337 -271 505 -35 66 -99 185 -142 265 -43 80 -110 206 -150 280 -40 74 -87 162 -105 195 -17 33 -74 139 -126 235 -51 96 -100 189 -109 207 -8 18 -17 32 -20 32 -3 0 -12 -14 -20 -32z" />
            <use href="#auth-bentuk-kerucut" fill="url(#auth-kerucut)" />
            <use href="#auth-bentuk-kerucut" fill="url(#auth-kerucut-gelap)" />
          </g>
        </svg>
          <svg aria-hidden="true" viewBox="0 0 500 500" className="relative w-[204px] xl:w-[220px] h-auto shrink-0 ml-[-74px] xl:ml-[-82px] top-[36px] overflow-visible">
            <defs>
              <radialGradient id="auth-bola" cx="0.38" cy="0.32" r="0.72" fx="0.32" fy="0.26">
                <stop offset="0" stopColor="#D2F6EE" />
                <stop offset="0.5" stopColor="#6CC7BB" />
                <stop offset="1" stopColor="#1F7478" />
              </radialGradient>
              <linearGradient id="auth-bola-gelap" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0.35" stopColor="#0B4F56" stopOpacity="0" />
                <stop offset="1" stopColor="#063A40" stopOpacity="0.6" />
              </linearGradient>
              <radialGradient id="auth-bola-bayangan" cx="0.2" cy="0.5" fx="0.12" fy="0.5" r="0.85">
                <stop offset="0%" stopColor="#042226" stopOpacity="0.48" />
                <stop offset="25%" stopColor="#07353C" stopOpacity="0.3" />
                <stop offset="60%" stopColor="#0B4850" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#0F5F66" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="auth-bola-penumbra" cx="0.25" cy="0.5" r="0.75">
                <stop offset="0%" stopColor="#073E44" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#073E44" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="auth-bola-kontak" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0%" stopColor="#021417" stopOpacity="0.75" />
                <stop offset="50%" stopColor="#05282D" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#05282D" stopOpacity="0" />
              </radialGradient>
            </defs>
            <ellipse cx="385" cy="451" rx="160" ry="26" fill="url(#auth-bola-penumbra)" />
            <ellipse cx="370" cy="450" rx="130" ry="18" fill="url(#auth-bola-bayangan)" />
            <ellipse cx="252" cy="450" rx="42" ry="6" fill="url(#auth-bola-kontak)" />
            <circle cx="250" cy="250" r="200" fill="url(#auth-bola)" />
            <circle cx="250" cy="250" r="200" fill="url(#auth-bola-gelap)" />
          </svg>
        </div>

        <div className="text-[11px] text-[var(--accent-text)]/80 font-mono pt-8 border-t border-[var(--accent)]/20 mt-8 lg:mt-0">
          {t.auth.shell.standar}
        </div>
      </div>

      <div className="relative order-1 lg:order-2 flex-1 flex items-center justify-center overflow-hidden bg-[var(--canvas)] p-6 sm:p-10">
        <LatarLabirin />
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
