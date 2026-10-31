import Image from "next/image";
import latar from "@/gambar/latar-perpustakaan.avif";

// Foto perpustakaan sebagai latar kolom form di layar lebar. Berkasnya sudah dikonversi ke AVIF (±49 KB,
// asli PNG 1,8 MB tersimpan di aset-asli/), jadi disajikan apa adanya (unoptimized) langsung dari
// /_next/static/media tanpa melewati fungsi pengoptimal gambar. Diimpor statis: nama berkasnya memuat hash
// isinya, sehingga mengganti foto otomatis memutus cache peramban dan CDN.
//
// Di bawah 768 px gambar disembunyikan dan tidak diunduh (lazy pada elemen display:none), karena di ponsel
// kolom form berada di layar pertama dan gambar selebar itu akan menjadi elemen LCP; di sana yang tampil
// hanya warna hijau pudar kolomnya. Di tema gelap gambar diredupkan agar tidak menyilaukan.
export default function LatarPerpustakaan() {
  return (
    <Image
      src={latar}
      alt=""
      fill
      unoptimized
      aria-hidden="true"
      className="pointer-events-none hidden object-cover object-center md:block [[data-tema=gelap]_&]:opacity-25"
    />
  );
}
