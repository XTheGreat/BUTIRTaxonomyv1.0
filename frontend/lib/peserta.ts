const NAMA_HEADER = "X-Peserta-Token";

function kunciNama(nama: string): string {
  return nama.split(/\s+/).filter(Boolean).join(" ").toLowerCase();
}

function kunciPenyimpanan(kodeAkses: string, nama: string): string {
  return `butir_peserta:${kodeAkses}:${kunciNama(nama)}`;
}

export function ambilToken(kodeAkses: string, nama: string): string | null {
  try {
    return localStorage.getItem(kunciPenyimpanan(kodeAkses, nama));
  } catch {
    return null;
  }
}

export function simpanToken(kodeAkses: string, nama: string, token: string): void {
  try {
    localStorage.setItem(kunciPenyimpanan(kodeAkses, nama), token);
  } catch {
  }
}

// Antrian jawaban yang belum sampai ke server (koneksi putus). Disimpan di localStorage agar
// bertahan saat halaman dimuat ulang atau peramban tertutup; hanya berisi huruf pilihan per butir,
// dan baru dikirim setelah peserta lolos autentikasi token.
export type AntrianJawaban = Record<string, string>;

function kunciAntrian(kodeAkses: string, nama: string): string {
  return `butir_antrian:${kodeAkses}:${kunciNama(nama)}`;
}

export function bacaAntrian(kodeAkses: string, nama: string): AntrianJawaban {
  try {
    const mentah = JSON.parse(localStorage.getItem(kunciAntrian(kodeAkses, nama)) || "{}");
    if (!mentah || typeof mentah !== "object" || Array.isArray(mentah)) return {};
    return Object.fromEntries(
      Object.entries(mentah).filter(
        (e): e is [string, string] => typeof e[1] === "string" && e[1].length === 1,
      ),
    );
  } catch {
    return {};
  }
}

function tulisAntrian(kodeAkses: string, nama: string, antrian: AntrianJawaban): void {
  try {
    if (Object.keys(antrian).length === 0) localStorage.removeItem(kunciAntrian(kodeAkses, nama));
    else localStorage.setItem(kunciAntrian(kodeAkses, nama), JSON.stringify(antrian));
  } catch {
  }
}

export function tambahKeAntrian(kodeAkses: string, nama: string, butirId: string, pilihan: string): void {
  tulisAntrian(kodeAkses, nama, { ...bacaAntrian(kodeAkses, nama), [butirId]: pilihan });
}

// Dibuang hanya bila nilainya masih sama, supaya pilihan yang diganti saat pengiriman berjalan tidak hilang.
export function keluarkanDariAntrian(kodeAkses: string, nama: string, butirId: string, pilihan: string): void {
  const antrian = bacaAntrian(kodeAkses, nama);
  if (antrian[butirId] !== pilihan) return;
  delete antrian[butirId];
  tulisAntrian(kodeAkses, nama, antrian);
}

export function hapusAntrian(kodeAkses: string, nama: string): void {
  tulisAntrian(kodeAkses, nama, {});
}

// Sesi pengerjaan per tab (sessionStorage): bertahan saat memuat ulang, hilang saat tab ditutup.
// Sengaja bukan localStorage agar komputer bersama tidak langsung membuka ujian peserta sebelumnya.
export interface SesiUjian {
  nama: string;
  indeks: number;
}

const kunciSesi = (kodeAkses: string) => `butir_sesi:${kodeAkses}`;

export function simpanSesi(kodeAkses: string, sesi: SesiUjian): void {
  try {
    sessionStorage.setItem(kunciSesi(kodeAkses), JSON.stringify(sesi));
  } catch {
  }
}

export function bacaSesi(kodeAkses: string): SesiUjian | null {
  try {
    const mentah = JSON.parse(sessionStorage.getItem(kunciSesi(kodeAkses)) || "null");
    if (
      mentah &&
      typeof mentah.nama === "string" &&
      mentah.nama.length > 0 &&
      mentah.nama.length <= 100 &&
      Number.isInteger(mentah.indeks) &&
      mentah.indeks >= 0
    ) {
      return { nama: mentah.nama, indeks: mentah.indeks };
    }
  } catch {
  }
  return null;
}

export function hapusSesi(kodeAkses: string): void {
  try {
    sessionStorage.removeItem(kunciSesi(kodeAkses));
  } catch {
  }
}

export function headerPeserta(kodeAkses: string, nama: string): Record<string, string> {
  const token = ambilToken(kodeAkses, nama);
  return token ? { [NAMA_HEADER]: token } : {};
}
