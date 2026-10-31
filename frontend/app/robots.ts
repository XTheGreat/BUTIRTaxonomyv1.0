import type { MetadataRoute } from "next";
import { HALAMAN_PUBLIK, URL_SITUS } from "@/lib/seo";

// Penjelajah AI dan pengikis data ditolak sepenuhnya (proxy.ts juga menjawab mereka 403).
const BOT_DITOLAK = [
  "GPTBot", "ChatGPT-User", "OAI-SearchBot", "ClaudeBot", "Claude-Web", "anthropic-ai", "CCBot", "PerplexityBot",
  "Bytespider", "Google-Extended", "Applebot-Extended", "Amazonbot", "meta-externalagent", "cohere-ai", "Diffbot",
  "PetalBot", "SemrushBot", "AhrefsBot", "MJ12bot", "DotBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: BOT_DITOLAK, disallow: "/" },
      // Aturan yang lebih spesifik (Allow) mengalahkan Disallow: "/" bagi mesin pencari.
      { userAgent: "*", allow: [...HALAMAN_PUBLIK], disallow: "/" },
    ],
    sitemap: `${URL_SITUS}/sitemap.xml`,
  };
}
