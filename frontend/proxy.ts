import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { halamanPublik } from "@/lib/seo";

const POLA_BOT =
  /bot|crawl|spider|slurp|scrap|headless|lighthouse|pagespeed|gtmetrix|python|aiohttp|httpx|go-http-client|okhttp|libwww|wget|curl|axios|node-fetch|undici|java\/|httpclient|postman|insomnia|gptbot|chatgpt|claudebot|claude-web|claude-user|claude-searchbot|anthropic-ai|perplexity|ccbot|bytespider|amazon|facebookexternalhit|meta-external|applebot|duckassist|youbot|cohere|diffbot|imagesift|omgili|petalbot|semrush|ahrefs|mj12|dotbot|lightsite/i;

const POLA_PAGESPEED = /lighthouse|pagespeed/gi;

// Di halaman publik saja (lihat HALAMAN_PUBLIK), mesin pencari dan alat ukur performa boleh masuk agar
// halaman bisa diindeks dan dinilai. Penjelajah AI dan pengikis lain tetap ditolak di mana pun.
const POLA_PENGINDEKS = /googlebot|google-inspectiontool|bingbot|lighthouse|pagespeed/i;

// Pelonggaran sementara untuk mengukur performa: set IZINKAN_PAGESPEED=1 di environment.
// Hanya kata "lighthouse"/"pagespeed" yang dibuang dari pemeriksaan; bot lain tetap ditolak.
const IZINKAN_PAGESPEED = process.env.IZINKAN_PAGESPEED === "1";

export function proxy(request: NextRequest) {
  const agen = request.headers.get("user-agent") ?? "";
  const agenDiperiksa = IZINKAN_PAGESPEED ? agen.replace(POLA_PAGESPEED, "") : agen;
  const publik = halamanPublik(request.nextUrl.pathname);
  const pengindeksDiHalamanPublik = publik && POLA_PENGINDEKS.test(agen);

  if (!agen || (POLA_BOT.test(agenDiperiksa) && !pengindeksDiHalamanPublik)) {
    return new NextResponse("Akses otomatis tidak diizinkan.", {
      status: 403,
      headers: { "content-type": "text/plain; charset=utf-8", "x-robots-tag": "noindex, nofollow, noarchive" },
    });
  }

  const respons = NextResponse.next();
  // Halaman publik tidak diberi header noindex; meta robots-nya (index, follow) yang berlaku.
  if (!publik) respons.headers.set("x-robots-tag", "noindex, nofollow, noarchive");
  return respons;
}

// Berkas gambar statis dikecualikan: pengoptimal next/image mengambil sumbernya lewat permintaan
// internal tanpa user-agent browser, dan akan gagal ("not a valid image") bila diblokir di sini.
// Yang dilindungi tetap halaman dan API, bukan aset gambar publik.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|icon.png|icon.svg|.*\\.(?:png|jpe?g|webp|avif|gif|svg|ico)$).*)"],
};
