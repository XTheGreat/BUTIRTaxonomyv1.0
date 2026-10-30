import math
import statistics


def hitung_tingkat_kesukaran(jawaban_benar: int, total_peserta: int) -> float:
    if total_peserta == 0:
        return 0.0
    return round(jawaban_benar / total_peserta, 4)


def hitung_daya_beda(
    skor_total_per_siswa: list[tuple[str, float]],
    jawaban_per_butir: dict[str, bool],
) -> float:
    if len(skor_total_per_siswa) < 4:
        return 0.0

    sorted_siswa = sorted(skor_total_per_siswa, key=lambda x: x[1], reverse=True)
    n = len(sorted_siswa)
    group_size = max(1, math.ceil(n * 0.27))

    upper_group = [s[0] for s in sorted_siswa[:group_size]]
    lower_group = [s[0] for s in sorted_siswa[-group_size:]]

    upper_correct = sum(1 for nama in upper_group if jawaban_per_butir.get(nama, False))
    lower_correct = sum(1 for nama in lower_group if jawaban_per_butir.get(nama, False))

    daya_beda = (upper_correct - lower_correct) / group_size
    return round(daya_beda, 4)


# Ambang analisis butir klasik. Kelompok atas/bawah memakai 27% skor tertinggi/terendah.
MIN_PESERTA_DAYA_BEDA = 4
MIN_PESERTA_PENGECOH = 10
PROPORSI_KELOMPOK = 0.27
BATAS_MUDAH = 0.70
BATAS_SUKAR = 0.30
BATAS_TERLALU_MUDAH = 0.90
BATAS_TERLALU_SUKAR = 0.20
BATAS_PENGECOH_TIDAK_BERFUNGSI = 0.05
BATAS_SELISIH_PREDIKSI = 0.25


def kategori_kesukaran(p: float) -> str:
    if p > BATAS_MUDAH:
        return "mudah"
    if p < BATAS_SUKAR:
        return "sukar"
    return "sedang"


def kategori_daya_beda(d: float) -> str:
    if d >= 0.40:
        return "sangat_baik"
    if d >= 0.30:
        return "baik"
    if d >= 0.20:
        return "cukup"
    if d >= 0:
        return "lemah"
    return "terbalik"


def kategori_reliabilitas(r: float) -> str:
    if r >= 0.90:
        return "sangat_tinggi"
    if r >= 0.70:
        return "tinggi"
    if r >= 0.50:
        return "cukup"
    return "rendah"


def bagi_kelompok(skor_per_siswa: list[tuple[str, float]]) -> tuple[list[str], list[str]]:
    """Nama peserta kelompok atas dan bawah (27%). Skor sama diurutkan menurut nama agar hasilnya
    tetap sama untuk data yang sama, tidak bergantung pada urutan baris di database."""
    urut = sorted(skor_per_siswa, key=lambda s: (-s[1], s[0]))
    ukuran = max(1, math.ceil(len(urut) * PROPORSI_KELOMPOK))
    return [s[0] for s in urut[:ukuran]], [s[0] for s in urut[-ukuran:]]


def daya_beda_kelompok(atas: list[str], bawah: list[str], benar_per_siswa: dict[str, bool]) -> float:
    if not atas or not bawah:
        return 0.0
    benar_atas = sum(1 for nama in atas if benar_per_siswa.get(nama, False))
    benar_bawah = sum(1 for nama in bawah if benar_per_siswa.get(nama, False))
    return round((benar_atas - benar_bawah) / len(atas), 4)


def statistik_skor(skor: list[float]) -> dict | None:
    if not skor:
        return None
    return {
        "rata_rata": round(statistics.fmean(skor), 4),
        "simpangan_baku": round(statistics.pstdev(skor), 4),
        "median": round(statistics.median(skor), 4),
        "minimum": min(skor),
        "maksimum": max(skor),
    }


def hitung_kr20(skor: list[float], proporsi_benar_per_butir: list[float]) -> float | None:
    """Reliabilitas KR-20. None bila tidak terdefinisi (kurang dari 2 butir atau peserta, atau
    semua peserta bernilai sama sehingga variansi skor nol)."""
    k = len(proporsi_benar_per_butir)
    if k < 2 or len(skor) < 2:
        return None
    variansi = statistics.pvariance(skor)
    if variansi == 0:
        return None
    jumlah_pq = sum(p * (1 - p) for p in proporsi_benar_per_butir)
    return round((k / (k - 1)) * (1 - jumlah_pq / variansi), 4)


def analisis_pengecoh(
    opsi: list[str],
    kunci: str,
    pilihan_per_siswa: dict[str, str | None],
    atas: list[str],
    bawah: list[str],
) -> tuple[list[dict], int]:
    """Sebaran pilihan per opsi, termasuk berapa yang memilihnya di kelompok atas dan bawah.
    Mengembalikan (daftar opsi, jumlah peserta yang tidak menjawab)."""
    total = len(pilihan_per_siswa)
    hasil = []
    for huruf in opsi:
        dipilih = sum(1 for p in pilihan_per_siswa.values() if p == huruf)
        hasil.append({
            "opsi": huruf,
            "kunci": huruf == kunci,
            "dipilih": dipilih,
            "persen": round(dipilih / total, 4) if total else 0.0,
            "atas": sum(1 for n in atas if pilihan_per_siswa.get(n) == huruf),
            "bawah": sum(1 for n in bawah if pilihan_per_siswa.get(n) == huruf),
        })
    kosong = sum(1 for p in pilihan_per_siswa.values() if p is None or p not in opsi)
    return hasil, kosong


def rekomendasi_butir(
    *,
    total_peserta: int,
    tingkat_kesukaran: float,
    daya_beda: float,
    prediksi: float | None,
    pengecoh: list[dict],
) -> list[dict]:
    """Temuan yang layak ditinjau guru, sebagai kode stabil (diterjemahkan di klien).
    Temuan berbasis kelompok baru dimunculkan bila pesertanya cukup agar tidak berisik."""
    temuan: list[dict] = []

    def tambah(kode: str, opsi: str | None = None) -> None:
        temuan.append({"kode": kode, "opsi": opsi})

    if total_peserta >= MIN_PESERTA_DAYA_BEDA:
        if tingkat_kesukaran > BATAS_TERLALU_MUDAH:
            tambah("terlalu_mudah")
        elif tingkat_kesukaran < BATAS_TERLALU_SUKAR:
            tambah("terlalu_sukar")
        if daya_beda < 0:
            tambah("daya_beda_negatif")
        elif daya_beda < 0.20:
            tambah("daya_beda_lemah")

    if prediksi is not None and abs(prediksi - tingkat_kesukaran) >= BATAS_SELISIH_PREDIKSI:
        tambah("meleset_dari_prediksi")

    if total_peserta >= MIN_PESERTA_PENGECOH:
        kunci = next((p for p in pengecoh if p["kunci"]), None)
        for p in pengecoh:
            if p["kunci"]:
                continue
            if kunci is not None and p["atas"] >= 2 and p["atas"] > kunci["atas"]:
                tambah("kunci_dicurigai", p["opsi"])
            elif p["persen"] < BATAS_PENGECOH_TIDAK_BERFUNGSI:
                tambah("pengecoh_tidak_berfungsi", p["opsi"])
            elif p["atas"] >= 2 and p["atas"] > p["bawah"]:
                tambah("pengecoh_menarik_kelompok_atas", p["opsi"])
    return temuan
