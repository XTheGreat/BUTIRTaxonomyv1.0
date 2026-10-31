import type { MetadataRoute } from "next";
import { HALAMAN_PUBLIK, URL_SITUS } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return HALAMAN_PUBLIK.map((path) => ({ url: `${URL_SITUS}${path}` }));
}
