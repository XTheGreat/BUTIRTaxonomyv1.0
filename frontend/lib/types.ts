export interface User {
  id: string;
  nama: string;
  email: string;
  peran?: "guru" | "admin";
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Materi {
  id: string;
  guru_id: string;
  judul: string;
  file_path: string;
  created_at: string;
}

export interface KisiKisi {
  id: string;
  guru_id: string;
  jumlah_butir: number;
  distribusi_bloom: Record<string, number>;
  cakupan_bab: string | null;
  nama?: string | null;
  created_at: string;
}

export interface KisiKisiRingkas extends KisiKisi {
  materi: { id: string; judul: string }[];
  butir_dibuat: number;
  butir_berjalan: number;
}

export interface CekCakupan {
  ada_cakupan: boolean;
  kata_kunci: string[];
  jumlah_potongan: number;
  potongan_cocok: number;
}

export interface ButirSoal {
  id: string;
  kisi_kisi_id: string;
  pertanyaan: string;
  pilihan: Record<string, string>;
  kunci_jawaban: string;
  pembahasan: string;
  level_bloom: string;
  level_target?: string | null;
  bobot_poin: number;
  status: string;
  ronde_saat_ini: number;
  prediksi_kesukaran: number | null;
  rujukan_chunk_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ButirTertunda {
  id: string;
  kisi_kisi_id: string;
  kisi_kisi_label: string;
  level_bloom: string;
  status: string;
  ronde_saat_ini: number;
  percobaan_ke: number;
  alasan_tertunda: string | null;
  bisa_dilanjutkan?: boolean;
  pertanyaan?: string;
  updated_at: string;
}

export interface HistoryDebatTerakhir {
  kisi_kisi_id: string;
  label: string;
  mulai: string;
  selesai: string;
  total: number;
  hitung: Record<string, number>;
  items: {
    id: string;
    level_bloom: string;
    status: string;
    ronde_saat_ini: number;
    percobaan_ke: number;
    pertanyaan: string;
    pilihan?: Record<string, string> | null;
    kunci_jawaban?: string | null;
    pembahasan?: string | null;
  }[];
}

export interface RiwayatPercobaan {
  id: string;
  percobaan_ke: number;
  hasil: string;
  ronde_terakhir: number;
  alasan: string | null;
  mulai: string;
  selesai: string | null;
}

export interface DebatLog {
  id: string;
  butir_id: string;
  percobaan_ke: number;
  ronde: number;
  agen: string;
  output_json: Record<string, any>;
  created_at: string;
}

export interface PaketUjian {
  id: string;
  guru_id: string;
  judul: string;
  status: string;
  kode_akses: string | null;
  waktu_mulai: string | null;
  waktu_selesai: string | null;
  durasi_menit: number;
  created_at: string;
  rilis_hasil: "otomatis" | "manual";
  hasil_dirilis: boolean;
  hasil_dirilis_pada: string | null;
  butir_list: { butir_id: string; urutan: number }[];
}

export interface PesertaUjian {
  id: string | null;
  nama_siswa: string;
  masuk_pada: string | null;
  total_soal: number;
  terjawab: number;
  terkumpul: boolean;
  total_benar: number | null;
  nilai: number | null;
  sesi_aktif: boolean;
  lama: boolean;
}

export interface LogLLMEntry {
  waktu: string;
  butir_id: string | null;
  percobaan_butir: number | null;
  ronde: number | null;
  peran: string;
  kelompok: string;
  provider: string;
  model: string;
  fallback: boolean;
  percobaan_panggilan: number;
  status: string;
  kode_http: number | null;
  latensi_ms: number;
  token_prompt: number | null;
  token_jawaban: number | null;
  token_total: number | null;
  galat: string | null;
}

export interface RingkasanLogLLM {
  hari: number;
  admin: boolean;
  total_permintaan: number;
  total_gagal: number;
  total_token: number;
  rincian: {
    provider: string;
    model: string;
    peran: string;
    permintaan: number;
    sukses: number;
    gagal: number;
    rate_limit: number;
    token_total: number;
    latensi_rata_rata_ms: number | null;
    latensi_maks_ms: number | null;
    lewat_fallback: number;
  }[];
  ronde: {
    batas_detik: number;
    jumlah: number;
    rata_rata_detik: number | null;
    p95_detik: number | null;
    maks_detik: number | null;
    melewati_batas: number;
    persen_melewati_batas: number | null;
  };
  penugasan: {
    peran: string;
    kelompok?: string;
    provider?: string;
    model?: string;
    fallback?: boolean;
    galat?: string;
  }[];
  peringatan: string[];
}

export interface GenerationStatus {
  kisi_kisi_id: string;
  total: number;
  selesai: number;
  items: {
    id: string;
    status: string;
    level_bloom: string;
    ronde_saat_ini: number;
    pertanyaan: string;
  }[];
}

export interface SoalUjian {
  id: string;
  pertanyaan: string;
  pilihan: Record<string, string>;
  level_bloom: string;
  bobot_poin: number;
  urutan: number;
}

export interface HasilUjian {
  nama_siswa: string;
  judul_ujian: string;
  total_soal: number;
  total_benar: number;
  skor: number;
  detail: {
    butir_id: string;
    jawaban_siswa: string | null;
    kunci_jawaban: string;
    benar: boolean;
    pertanyaan: string;
  }[];
}

export interface LaporanButir {
  butir_id: string;
  pertanyaan: string;
  level_bloom: string;
  prediksi_kesukaran: number | null;
  tingkat_kesukaran_aktual: number;
  daya_beda: number;
  total_jawab: number;
  total_benar: number;
}

export interface Laporan {
  ujian_id: string;
  judul: string;
  total_peserta: number;
  daya_beda_dihitung?: boolean;
  daya_beda_indikatif?: boolean;
  min_peserta_bermakna?: number;
  analisis_butir: LaporanButir[];
}

export interface BatasPaket {
  soal: number | null;
  materi: number | null;
  ekspor: boolean;
}

export interface PaketPemakaian {
  bulan: string;
  paket: string;
  nama_paket: string;
  kuota_aktif: boolean;
  tanpa_batas: boolean;
  admin: boolean;
  institusi: { id: string; nama: string; kursi: number } | null;
  soal: { terpakai: number; batas: number | null; sisa: number | null };
  materi: { terpakai: number; batas: number | null };
  ekspor: boolean;
  token: { bulan_ini: number; harga_per_1000: number; estimasi_biaya_rp: number | null };
}

export interface PaketPengguna {
  id: string;
  nama: string;
  email: string;
  peran: string;
  paket: string;
  soal_bulan_ini: number;
  token_bulan_ini: number;
}

export interface InstitusiRingkas {
  id: string;
  nama: string;
  kursi: number;
  aktif: boolean;
  anggota: number;
}

export interface InstitusiSaya extends InstitusiRingkas {
  bisa_kelola: boolean;
  anggota_daftar: {
    id: string;
    nama: string;
    email: string;
    admin_institusi: boolean;
    soal_bulan_ini: number;
    token_bulan_ini: number;
  }[];
}

export interface ListingMarketplace {
  id: string;
  judul: string;
  deskripsi: string;
  harga_rp: number;
  aktif: boolean;
  penjual: string;
  milik_saya: boolean;
  jumlah_butir: number;
  distribusi_bloom: Record<string, number>;
  status_pembelian: "menunggu_pembayaran" | "selesai" | null;
  created_at: string;
  pratinjau?: { urutan: number; pertanyaan: string; level_bloom: string }[];
}

export interface TransaksiMarket {
  id: string;
  listing_id: string;
  judul: string;
  harga_rp: number;
  komisi_rp: number;
  pendapatan_penjual_rp: number;
  status: string;
  created_at: string;
  selesai_pada: string | null;
  pembeli?: string;
}

export interface RekapTransaksi {
  pembelian: TransaksiMarket[];
  penjualan: TransaksiMarket[];
  total_pendapatan_rp: number;
  komisi_persen: number;
}

export interface PesanDebat {
  id: string;
  ronde: number;
  agen: string;
  output_json: Record<string, any>;
  created_at: string;
}

export interface DebatLive {
  butir_id: string;
  kisi_kisi_id: string;
  status: string;
  level_bloom: string;
  percobaan_ke: number;
  ronde_saat_ini: number;
  max_ronde: number;
  alasan_tertunda: string | null;
  menunggu_giliran: boolean;
  sedang_berpikir: { ronde: number; agen: string[] } | null;
  pesan: PesanDebat[];
}

export interface ArsipSoal {
  id: string;
  kisi_kisi_id: string;
  kisi_kisi_label: string;
  pertanyaan: string;
  pilihan: Record<string, string>;
  kunci_jawaban: string;
  pembahasan: string;
  bobot_poin: number;
  sumber_butir_id: string | null;
  ronde: number | null;
  asal_status: string | null;
  jawaban_penjawab_buta: string | null;
  keyakinan_penjawab_buta: number | null;
  created_at: string;
}
