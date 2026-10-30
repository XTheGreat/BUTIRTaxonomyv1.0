import type galatSiswaId from "../id/galatSiswa";

const galatSiswa: typeof galatSiswaId = {
  siswa_sesi_tidak_valid: "Your participant session is not valid. Please sign in again from the exam page.",
  siswa_belum_masuk: "This student has not joined this exam",
  siswa_kode_akses_tidak_ditemukan: "Access code not found",
  siswa_ujian_tidak_aktif: "The exam is not active",
  siswa_ujian_belum_dimulai: "The exam has not started yet",
  siswa_waktu_ujian_berakhir: "The exam time has ended",
  siswa_nama_baru_dipakai: "This name was just taken by another participant. Try again with a different name.",
  siswa_nama_sudah_dipakai: (p) =>
    `The name "${p.nama}" is already taken by another participant in this exam. If that is you and you switched devices, ask your teacher to let you rejoin. If not, add your class or roll number to your name.`,
  siswa_ujian_tidak_ditemukan: "Exam not found",
  siswa_butir_tidak_ada: "This item is not part of this exam",
  siswa_pilihan_tidak_valid: "That choice is not valid for this item",
  siswa_jawaban_sudah_disubmit: "Answers have already been submitted",
  siswa_jawaban_belum_dikumpulkan: "Answers have not been submitted yet",
  siswa_hasil_belum_dirilis:
    "Your answers have been submitted, but your teacher has not released the results yet. Please check back later.",
  laporan_ujian_tidak_ditemukan: "Exam not found",
  laporan_bukan_ujian_anda: "This is not your exam",
};

export default galatSiswa;
