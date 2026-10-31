import Image from "next/image";
import banner from "@/gambar/banner-auth.avif";

// Foto banner (potret) sebagai latar kolom kiri halaman Masuk/Daftar/Lupa password. Berkasnya sudah dikonversi
// ke AVIF (±29 KB, asli PNG 1,5 MB tersimpan di aset-asli/) dan disajikan apa adanya (unoptimized). Diimpor
// statis agar mengganti fotonya otomatis memutus cache (nama berkas membawa hash isinya).
//
// Lapisan hijau BUTIR di atasnya menjaga teks putih tetap terbaca: terukur pada foto aslinya, 90% piksel di
// belakang teks berkontras minimal 4,6:1 dan titik terterang (jendela, sinar matahari) sekitar 4,2:1.
// Menaikkan opasitas membuat fotonya makin tak terlihat; menurunkannya membuat teks kecil sulit dibaca.
export default function BannerAuth() {
  return (
    <>
      <Image
        src={banner}
        alt=""
        fill
        unoptimized
        aria-hidden="true"
        className="pointer-events-none object-cover object-center"
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[var(--accent)]/74" />
    </>
  );
}
