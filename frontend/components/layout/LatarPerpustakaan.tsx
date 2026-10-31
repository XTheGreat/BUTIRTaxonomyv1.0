import Image from "next/image";

// Foto perpustakaan sebagai latar kolom form di layar lebar. Di bawah 768 px gambarnya disembunyikan dan
// tidak diunduh (lazy pada elemen display:none), karena di ponsel kolom form berada di layar pertama dan
// gambar selebar itu akan menjadi elemen LCP; di sana yang tampil hanya warna hijau pudar kolomnya.
// Di tema gelap gambar diredupkan agar tidak menyilaukan.
export default function LatarPerpustakaan() {
  return (
    <Image
      src="/latar-perpustakaan.png"
      alt=""
      fill
      sizes="(min-width: 1024px) 60vw, 100vw"
      quality={60}
      aria-hidden="true"
      className="pointer-events-none hidden object-cover object-center md:block [[data-tema=gelap]_&]:opacity-25"
    />
  );
}
