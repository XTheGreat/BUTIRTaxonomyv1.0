"""Membuat ujian contoh berisi 36 peserta palsu agar halaman Laporan Analisis bisa dilihat tanpa
menunggu ujian sungguhan. Semua data diberi tanda "[CONTOH]" dan bisa dihapus dengan --hapus.

Dipakai dari folder backend (database mengikuti DATABASE_URL / .env yang aktif):

    python scripts/seed_contoh_analisis.py --email guru@contoh.id --ya
    python scripts/seed_contoh_analisis.py --email guru@contoh.id --hapus --ya
"""
import argparse
import asyncio
import math
import random
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import delete, select
from sqlalchemy.engine import make_url

from app.config import get_settings
from app.database import async_session, engine
from app.models.butir_soal import ButirSoal
from app.models.jawaban_siswa import JawabanSiswa
from app.models.kisi_kisi import KisiKisi
from app.models.paket_ujian import PaketUjian, PaketUjianButir
from app.models.peserta_ujian import PesertaUjian, kunci_nama
from app.models.user import User

PENANDA = "[CONTOH]"
KODE_AKSES = "CONTOH01"
JUMLAH_PESERTA = 36
SEED = 6  # dipilih agar tiap butir menampilkan jenis temuan yang dimaksud

# (pertanyaan, pilihan, kunci tertulis, kunci sebenarnya, tingkat Bloom, kesulitan b, daya beda a, perilaku)
# Tiap butir sengaja dibuat berperilaku berbeda agar laporan menampilkan semua jenis temuan.
BUTIR = [
    ("Perintah SQL yang dipakai untuk mengambil data dari sebuah tabel adalah ...",
     {"A": "INSERT", "B": "SELECT", "C": "UPDATE", "D": "DELETE"}, "B", "B", "C1", -0.6, 1.3, "baik"),
    ("Kolom yang nilainya unik dan mengidentifikasi setiap baris dalam tabel disebut ...",
     {"A": "Primary key", "B": "Foreign key", "C": "Index", "D": "View"}, "A", "A", "C1", -4.0, 1.2, "terlalu_mudah"),
    ("Sebuah tabel memiliki ketergantungan transitif antar atribut non-kunci. Normalisasi minimal yang perlu diterapkan adalah ...",
     {"A": "1NF", "B": "2NF", "C": "BCNF", "D": "3NF"}, "D", "D", "C3", 2.0, 1.0, "terlalu_sukar"),
    ("Pada ERD, hubungan antara Dosen dan Mata Kuliah (satu dosen mengampu banyak mata kuliah, satu mata kuliah diampu banyak dosen) bersifat ...",
     {"A": "One-to-one", "B": "One-to-many", "C": "Many-to-one", "D": "Many-to-many"}, "C", "D", "C2", -0.3, 1.4, "kunci_keliru"),
    ("Manakah klausa yang dipakai untuk menyaring baris setelah proses pengelompokan dengan GROUP BY?",
     {"A": "WHERE", "B": "HAVING", "C": "ORDER BY", "D": "LIMIT"}, "B", "B", "C2", 0.0, 1.1, "pengecoh_mati"),
    ("Sebuah indeks ditambahkan pada kolom yang jarang dipakai untuk pencarian. Dampak yang paling mungkin adalah ...",
     {"A": "Kueri baca selalu lebih cepat", "B": "Operasi tulis menjadi sedikit lebih lambat", "C": "Ukuran tabel berkurang", "D": "Data menjadi tidak konsisten"},
     "B", "B", "C3", 0.2, 0.0, "tak_membedakan"),
    ("Dua transaksi sama-sama membaca saldo lalu memperbarui nilainya sehingga salah satu pembaruan hilang. Masalah ini disebut ...",
     {"A": "Dirty read", "B": "Lost update", "C": "Phantom read", "D": "Deadlock"}, "B", "B", "C4", 0.4, 1.6, "baik"),
    ("Untuk menggabungkan baris dari dua tabel hanya bila ada pasangan yang cocok digunakan ...",
     {"A": "INNER JOIN", "B": "FULL OUTER JOIN", "C": "CROSS JOIN", "D": "LEFT JOIN"}, "A", "A", "C2", 1.2, 0.8, "pengecoh_kelompok_atas"),
    # Butir pelengkap yang berfungsi baik. Tanpa mereka skor sisa terlalu kasar untuk membedakan
    # peserta, sehingga butir yang bagus pun tampak lemah.
    ("Sifat ACID yang menjamin sebuah transaksi dijalankan seluruhnya atau tidak sama sekali adalah ...",
     {"A": "Atomicity", "B": "Consistency", "C": "Isolation", "D": "Durability"}, "A", "A", "C1", -0.8, 1.7, "baik"),
    ("Batasan yang memastikan sebuah kolom tidak boleh kosong adalah ...",
     {"A": "UNIQUE", "B": "CHECK", "C": "NOT NULL", "D": "DEFAULT"}, "C", "C", "C1", -1.0, 1.6, "baik"),
    ("Fungsi agregat yang menghitung jumlah baris adalah ...",
     {"A": "SUM", "B": "AVG", "C": "MAX", "D": "COUNT"}, "D", "D", "C1", -0.4, 1.7, "baik"),
    ("Pada LEFT JOIN, baris tabel kiri yang tidak punya pasangan di tabel kanan akan ...",
     {"A": "Dibuang dari hasil", "B": "Tetap tampil dengan nilai NULL di kolom tabel kanan", "C": "Menyebabkan kesalahan", "D": "Digandakan"},
     "B", "B", "C2", 0.3, 1.8, "baik"),
    ("Sebuah view dalam basis data paling tepat dipahami sebagai ...",
     {"A": "Kueri tersimpan yang berperilaku seperti tabel virtual", "B": "Salinan fisik tabel", "C": "Indeks khusus", "D": "Prosedur tersimpan"},
     "A", "A", "C2", 0.0, 1.6, "baik"),
    ("Tujuan utama normalisasi basis data adalah ...",
     {"A": "Mempercepat semua kueri", "B": "Memperkecil ukuran file database", "C": "Mengurangi redundansi dan anomali data", "D": "Menambah jumlah tabel"},
     "C", "C", "C2", 0.6, 1.7, "baik"),
]

NAMA_DEPAN = ["Andi", "Budi", "Citra", "Dewi", "Eka", "Fajar", "Gita", "Hana", "Indra", "Joko", "Kiki", "Lestari",
              "Maya", "Nanda", "Oki", "Putri", "Qori", "Rina", "Sari", "Tegar", "Umar", "Vina", "Wawan", "Xena",
              "Yudi", "Zahra", "Ayu", "Bayu", "Cahya", "Dimas", "Elsa", "Farhan", "Gilang", "Hesti", "Irfan", "Jihan"]


def sigmoid(x: float) -> float:
    return 1 / (1 + math.exp(-x))


def pilih_berbobot(rng: random.Random, bobot: dict[str, float]) -> str:
    total = sum(bobot.values())
    titik = rng.random() * total
    for opsi, b in bobot.items():
        titik -= b
        if titik <= 0:
            return opsi
    return next(iter(bobot))


def jawab(rng: random.Random, theta: float, butir: tuple) -> str | None:
    _, pilihan, kunci, benar, _, b, a, perilaku = butir
    if rng.random() < 0.02:
        return None
    if perilaku == "pengecoh_kelompok_atas" and rng.random() < 0.5 * sigmoid(2.5 * theta):
        # Alternatif yang tampak masuk akal bagi peserta berkemampuan tinggi.
        return "C"
    peluang_benar = 0.55 if perilaku == "tak_membedakan" else sigmoid(a * (theta - b))
    if rng.random() < peluang_benar:
        return benar
    salah = [o for o in pilihan if o != benar]
    bobot = {o: 1.0 for o in salah}
    if perilaku == "kunci_keliru":
        # Kunci tertulis (C) jarang dipilih; sisanya tersebar.
        bobot = {o: (0.35 if o == kunci else 1.0) for o in salah}
    elif perilaku == "pengecoh_mati":
        bobot = {o: (1.0 if o == "C" else 0.02) for o in salah}
    elif perilaku == "pengecoh_kelompok_atas":
        bobot = {o: (0.15 if o == "C" else 1.0) for o in salah}
    return pilih_berbobot(rng, bobot)


async def target_db_teks() -> str:
    url = make_url(get_settings().DATABASE_URL)
    return f"{url.get_backend_name()} @ {url.host or url.database}"


async def hapus_contoh(guru: User) -> None:
    async with async_session() as db:
        pakets = (await db.execute(
            select(PaketUjian).where(PaketUjian.guru_id == guru.id, PaketUjian.judul.like(f"{PENANDA}%"))
        )).scalars().all()
        kisi = (await db.execute(
            select(KisiKisi).where(KisiKisi.guru_id == guru.id, KisiKisi.nama.like(f"{PENANDA}%"))
        )).scalars().all()
        for p in pakets:
            await db.execute(delete(JawabanSiswa).where(JawabanSiswa.paket_ujian_id == p.id))
            await db.execute(delete(PesertaUjian).where(PesertaUjian.paket_ujian_id == p.id))
            await db.delete(p)
        for k in kisi:
            await db.execute(delete(ButirSoal).where(ButirSoal.kisi_kisi_id == k.id))
            await db.delete(k)
        await db.commit()
    print(f"Dihapus: {len(pakets)} ujian contoh dan {len(kisi)} kisi-kisi contoh.")


async def buat_contoh(guru: User) -> None:
    async with async_session() as db:
        ada = (await db.execute(
            select(PaketUjian.id).where(PaketUjian.guru_id == guru.id, PaketUjian.judul.like(f"{PENANDA}%"))
        )).first()
        if ada:
            print("Ujian contoh sudah ada untuk akun ini. Jalankan dulu dengan --hapus bila ingin membuat ulang.")
            return
        if (await db.execute(select(PaketUjian.id).where(PaketUjian.kode_akses == KODE_AKSES))).first():
            print(f"Kode akses {KODE_AKSES} sudah dipakai ujian lain; hentikan agar tidak menimpa data.")
            return

        kisi = KisiKisi(guru_id=guru.id, jumlah_butir=len(BUTIR), distribusi_bloom={"C1": 36, "C2": 43, "C3": 14, "C4": 7},
                        nama=f"{PENANDA} Basis Data Dasar")
        db.add(kisi)
        await db.flush()

        butir_orm: list[ButirSoal] = []
        for teks, pilihan, kunci, _, bloom, b, _, _ in BUTIR:
            butir = ButirSoal(
                kisi_kisi_id=kisi.id, pertanyaan=teks, pilihan=pilihan, kunci_jawaban=kunci, level_bloom=bloom,
                status="diterima", prediksi_kesukaran=round(sigmoid(-b), 2), pembahasan="Butir contoh untuk melihat laporan analisis.",
            )
            db.add(butir)
            butir_orm.append(butir)
        await db.flush()

        sekarang = datetime.now(timezone.utc)
        paket = PaketUjian(
            guru_id=guru.id, judul=f"{PENANDA} Ujian Basis Data (contoh analisis)", status="aktif", kode_akses=KODE_AKSES,
            waktu_mulai=sekarang - timedelta(days=2), waktu_selesai=sekarang - timedelta(days=1, hours=22),
            durasi_menit=60, rilis_hasil="otomatis",
        )
        db.add(paket)
        await db.flush()
        for urutan, butir in enumerate(butir_orm, start=1):
            db.add(PaketUjianButir(paket_ujian_id=paket.id, butir_id=butir.id, urutan=urutan))

        rng = random.Random(SEED)
        for i in range(JUMLAH_PESERTA):
            nama = f"{NAMA_DEPAN[i % len(NAMA_DEPAN)]} (contoh {i + 1:02d})"
            theta = rng.gauss(0, 1)
            kumpul = paket.waktu_mulai + timedelta(minutes=25 + (i * 7) % 34)
            db.add(PesertaUjian(paket_ujian_id=paket.id, nama_siswa=nama, nama_kunci=kunci_nama(nama), masuk_pada=paket.waktu_mulai))
            for butir_data, butir in zip(BUTIR, butir_orm):
                pilihan = jawab(rng, theta, butir_data)
                db.add(JawabanSiswa(
                    paket_ujian_id=paket.id, nama_siswa=nama, butir_id=butir.id, jawaban_pilihan=pilihan,
                    benar=(pilihan == butir_data[2]), submitted_at=kumpul,
                ))
        await db.commit()
        print(f"Dibuat: ujian contoh (id {paket.id}) dengan {JUMLAH_PESERTA} peserta dan {len(BUTIR)} butir.")
        print(f"Buka: /laporan/{paket.id}")


async def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--email", required=True, help="email akun guru pemilik data contoh")
    parser.add_argument("--hapus", action="store_true", help="hapus data contoh milik akun itu")
    parser.add_argument("--ya", action="store_true", help="konfirmasi bahwa database yang ditampilkan memang tujuannya")
    args = parser.parse_args()

    print("Database tujuan:", await target_db_teks())
    if not args.ya:
        print("Belum dijalankan. Tambahkan --ya bila database di atas sudah benar.")
        return
    async with async_session() as db:
        guru = (await db.execute(select(User).where(User.email == args.email))).scalar_one_or_none()
    if not guru:
        print(f"Akun {args.email} tidak ditemukan di database ini.")
        return
    await (hapus_contoh(guru) if args.hapus else buat_contoh(guru))
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
