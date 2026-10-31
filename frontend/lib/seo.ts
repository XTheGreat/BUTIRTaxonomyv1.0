import type { Metadata } from "next";

// Alamat situs untuk URL kanonik, sitemap, dan metadataBase. Isi NEXT_PUBLIC_SITE_URL bila domainnya berganti.
export const URL_SITUS = (process.env.NEXT_PUBLIC_SITE_URL || "https://butir-taxonomyv1-0.vercel.app").replace(/\/+$/, "");

// Hanya halaman ini yang boleh diindeks mesin pencari. Semua halaman lain (area guru, ujian siswa,
// pendaftaran, reset sandi) tetap noindex dan terblokir di robots.txt. Dipakai juga oleh proxy.ts.
export const HALAMAN_PUBLIK = ["/login", "/tentang", "/panduan", "/privasi", "/syarat"] as const;

export function halamanPublik(pathname: string): boolean {
  const normal = pathname.replace(/\/+$/, "") || "/";
  return (HALAMAN_PUBLIK as readonly string[]).includes(normal);
}

export function metadataPublik(opsi: { title: string; description: string; path: (typeof HALAMAN_PUBLIK)[number] }): Metadata {
  return {
    title: opsi.title,
    description: opsi.description,
    alternates: { canonical: opsi.path },
    robots: { index: true, follow: true },
  };
}
