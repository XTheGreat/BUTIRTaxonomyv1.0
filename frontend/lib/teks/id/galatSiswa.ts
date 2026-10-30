// Kode galat milik kelompok router Siswa. Semua kunci wajib berawalan nama routernya.
const galatSiswa = {
  siswa_sesi_tidak_valid: "Sesi peserta tidak valid. Masuk kembali dari halaman ujian.",
  siswa_belum_masuk: "Siswa belum masuk ke ujian ini",
  siswa_kode_akses_tidak_ditemukan: "Kode akses tidak ditemukan",
  siswa_ujian_tidak_aktif: "Ujian tidak aktif",
  siswa_ujian_belum_dimulai: "Ujian belum dimulai",
  siswa_waktu_ujian_berakhir: "Waktu ujian sudah berakhir",
  siswa_nama_baru_dipakai: "Nama ini baru saja dipakai peserta lain. Coba lagi dengan nama yang berbeda.",
  siswa_nama_sudah_dipakai: (p: { nama: string }) =>
    `Nama "${p.nama}" sudah dipakai peserta lain di ujian ini. Bila itu Anda dan berganti perangkat, minta guru mengizinkan masuk ulang. Bila bukan, tambahkan kelas atau nomor absen pada nama Anda.`,
  siswa_ujian_tidak_ditemukan: "Ujian tidak ditemukan",
  siswa_butir_tidak_ada: "Butir tidak ada dalam ujian ini",
  siswa_pilihan_tidak_valid: "Pilihan jawaban tidak valid untuk butir ini",
  siswa_jawaban_sudah_disubmit: "Jawaban sudah dikumpulkan",
  siswa_jawaban_belum_dikumpulkan: "Jawaban belum dikumpulkan",
  siswa_hasil_belum_dirilis:
    "Jawaban Anda sudah terkumpul, tetapi hasil belum dirilis guru. Silakan cek kembali nanti.",
  laporan_ujian_tidak_ditemukan: "Ujian tidak ditemukan",
  laporan_bukan_ujian_anda: "Ini bukan ujian Anda",
};

export default galatSiswa;
