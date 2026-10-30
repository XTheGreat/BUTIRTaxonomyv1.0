import Image from "next/image";

// Tekstur latar hanya terlihat pada opasitas 16%, jadi kualitasnya diturunkan dan lewat next/image
// dikirim sebagai WebP seukuran layar. Di layar kecil gambar disembunyikan (hidden md:block) dan
// tidak diunduh (lazy pada elemen display:none): gambar selebar kolom form itu sebelumnya menjadi
// elemen LCP di ponsel, padahal hampir tak terlihat. Teks judul kini menjadi LCP.
export default function LatarLabirin() {
  return (
    <Image
      src="/latar-labirin.jpg"
      alt=""
      fill
      sizes="100vw"
      quality={40}
      aria-hidden="true"
      className="pointer-events-none hidden object-cover object-center opacity-[0.16] mix-blend-multiply md:block"
    />
  );
}
