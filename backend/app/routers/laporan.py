import uuid
from collections import defaultdict
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.paket_ujian import PaketUjian, PaketUjianButir
from app.models.butir_soal import ButirSoal
from app.models.jawaban_siswa import JawabanSiswa
from app.core.deps import get_current_guru
from app.core.galat import Galat
from app.services.analytics import (
    MIN_PESERTA_DAYA_BEDA,
    MIN_PESERTA_PENGECOH,
    analisis_pengecoh,
    bagi_kelompok,
    daya_beda_kelompok,
    hitung_kr20,
    hitung_tingkat_kesukaran,
    kategori_daya_beda,
    kategori_kesukaran,
    kategori_reliabilitas,
    rekomendasi_butir,
    statistik_skor,
)

router = APIRouter(prefix="/api/ujian", tags=["laporan"])

MIN_PESERTA_BERMAKNA = 30


@router.get("/{ujian_id}/laporan")
async def get_laporan(
    ujian_id: uuid.UUID,
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(PaketUjian).where(PaketUjian.id == ujian_id))
    paket = result.scalar_one_or_none()
    if not paket:
        raise Galat(404, "laporan_ujian_tidak_ditemukan", "Ujian tidak ditemukan")
    if paket.guru_id != guru.id:
        raise Galat(403, "laporan_bukan_ujian_anda", "Bukan ujian Anda")

    pb_result = await db.execute(
        select(PaketUjianButir)
        .where(PaketUjianButir.paket_ujian_id == ujian_id)
        .order_by(PaketUjianButir.urutan)
    )
    butir_ids = [pb.butir_id for pb in pb_result.scalars().all()]

    butir_map: dict[uuid.UUID, ButirSoal] = {}
    all_jawaban: list[JawabanSiswa] = []
    if butir_ids:
        butir_result = await db.execute(select(ButirSoal).where(ButirSoal.id.in_(butir_ids)))
        butir_map = {b.id: b for b in butir_result.scalars().all()}
        jawaban_result = await db.execute(
            select(JawabanSiswa).where(
                JawabanSiswa.paket_ujian_id == ujian_id,
                JawabanSiswa.butir_id.in_(butir_ids),
                JawabanSiswa.submitted_at.isnot(None),
            )
        )
        all_jawaban = list(jawaban_result.scalars().all())

    jawaban_per_butir: dict[uuid.UUID, list[JawabanSiswa]] = defaultdict(list)
    siswa_scores: dict[str, float] = {}
    for j in all_jawaban:
        jawaban_per_butir[j.butir_id].append(j)
        siswa_scores[j.nama_siswa] = siswa_scores.get(j.nama_siswa, 0) + (1 if j.benar else 0)

    skor_total_per_siswa = list(siswa_scores.items())
    total_peserta = len(skor_total_per_siswa)
    daya_beda_dihitung = total_peserta >= MIN_PESERTA_DAYA_BEDA

    analisis_butir = []
    proporsi_benar: list[float] = []
    for butir_id in butir_ids:
        butir = butir_map.get(butir_id)
        if not butir:
            continue

        butir_jawaban = jawaban_per_butir.get(butir_id, [])
        jawaban_benar = sum(1 for j in butir_jawaban if j.benar)
        tingkat_kesukaran = hitung_tingkat_kesukaran(jawaban_benar, total_peserta)
        proporsi_benar.append(tingkat_kesukaran)

        benar_per_siswa = {j.nama_siswa: bool(j.benar) for j in butir_jawaban}
        # Kelompok atas/bawah ditentukan dari skor tanpa butir ini. Bila skor total dipakai, butir
        # itu ikut menentukan siapa yang "pintar" sehingga daya bedanya tampak lebih tinggi dari
        # sebenarnya (terutama pada ujian dengan butir sedikit).
        atas, bawah = (
            bagi_kelompok([(nama, skor - (1 if benar_per_siswa.get(nama) else 0)) for nama, skor in skor_total_per_siswa])
            if daya_beda_dihitung
            else ([], [])
        )
        daya_beda = daya_beda_kelompok(atas, bawah, benar_per_siswa)
        pengecoh, tidak_menjawab = analisis_pengecoh(
            sorted((butir.pilihan or {}).keys()),
            butir.kunci_jawaban,
            {j.nama_siswa: j.jawaban_pilihan for j in butir_jawaban},
            atas,
            bawah,
        )

        analisis_butir.append({
            "butir_id": str(butir_id),
            "pertanyaan": butir.pertanyaan,
            "level_bloom": butir.level_bloom,
            "kunci_jawaban": butir.kunci_jawaban,
            "prediksi_kesukaran": butir.prediksi_kesukaran,
            "tingkat_kesukaran_aktual": tingkat_kesukaran,
            "kategori_kesukaran": kategori_kesukaran(tingkat_kesukaran) if total_peserta else None,
            "daya_beda": daya_beda,
            "kategori_daya_beda": kategori_daya_beda(daya_beda) if daya_beda_dihitung else None,
            "total_jawab": len(butir_jawaban),
            "total_benar": jawaban_benar,
            "tidak_menjawab": tidak_menjawab,
            "pengecoh": pengecoh,
            "rekomendasi": rekomendasi_butir(
                total_peserta=total_peserta,
                tingkat_kesukaran=tingkat_kesukaran,
                daya_beda=daya_beda,
                prediksi=butir.prediksi_kesukaran,
                pengecoh=pengecoh,
            ),
        })

    kr20 = hitung_kr20([s for _, s in skor_total_per_siswa], proporsi_benar) if daya_beda_dihitung else None

    return {
        "ujian_id": str(ujian_id),
        "judul": paket.judul,
        "total_peserta": total_peserta,
        "daya_beda_dihitung": daya_beda_dihitung,
        "daya_beda_indikatif": total_peserta < MIN_PESERTA_BERMAKNA,
        "min_peserta_bermakna": MIN_PESERTA_BERMAKNA,
        "pengecoh_dianalisis": total_peserta >= MIN_PESERTA_PENGECOH,
        "min_peserta_pengecoh": MIN_PESERTA_PENGECOH,
        "statistik_skor": statistik_skor([s for _, s in skor_total_per_siswa]),
        "reliabilitas": {
            "kr20": kr20,
            "kategori": kategori_reliabilitas(kr20) if kr20 is not None else None,
        },
        "analisis_butir": analisis_butir,
    }
