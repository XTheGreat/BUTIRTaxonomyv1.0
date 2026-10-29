import io
import re
import uuid
import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import case, func, select
from app.database import get_db
from app.models.user import User
from app.models.butir_soal import ButirSoal
from app.models.kisi_kisi import KisiKisi
from app.models.jawaban_siswa import JawabanSiswa
from app.models.paket_ujian import PaketUjian, PaketUjianButir
from app.models.peserta_ujian import PesertaUjian
from app.schemas.ujian import (
    PaketUjianCreate,
    PaketUjianTerbitkan,
    PaketUjianResponse,
    RakitOtomatisRequest,
    RakitOtomatisResponse,
    RilisHasilRequest,
)
from app.core.galat import Galat
from app.core.deps import get_current_guru
from app.services.exam_assembly import rakit_paket
from app.services.export_dokumen import buat_dokumen

from app.services.paket import pastikan_ekspor

router = APIRouter(prefix="/api/ujian", tags=["ujian"])


@router.get("", response_model=list[PaketUjianResponse])
async def list_ujian(
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PaketUjian)
        .where(PaketUjian.guru_id == guru.id)
        .order_by(PaketUjian.created_at.desc())
    )
    return [PaketUjianResponse.model_validate(p) for p in result.scalars().all()]


@router.get("/{ujian_id}/peserta-count")
async def get_peserta_count(
    ujian_id: uuid.UUID,
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    from app.models.jawaban_siswa import JawabanSiswa
    from sqlalchemy import func
    paket = (
        await db.execute(select(PaketUjian).where(PaketUjian.id == ujian_id))
    ).scalar_one_or_none()
    if not paket or paket.guru_id != guru.id:
        raise Galat(404, "ujian_tidak_ditemukan", "Ujian tidak ditemukan")
    result = await db.execute(
        select(func.count(func.distinct(JawabanSiswa.nama_siswa)))
        .where(JawabanSiswa.paket_ujian_id == ujian_id)
    )
    return {"count": result.scalar() or 0}


@router.post("/rakit-otomatis", response_model=RakitOtomatisResponse)
async def rakit_otomatis(
    data: RakitOtomatisRequest,
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    pool = (
        (
            await db.execute(
                select(ButirSoal)
                .join(KisiKisi, KisiKisi.id == ButirSoal.kisi_kisi_id)
                .where(ButirSoal.status == "diterima", KisiKisi.guru_id == guru.id)
                .order_by(ButirSoal.created_at)
            )
        )
        .scalars()
        .all()
    )
    cakupan_kisi = dict(
        (
            await db.execute(
                select(KisiKisi.id, KisiKisi.cakupan_bab).where(KisiKisi.guru_id == guru.id)
            )
        ).all()
    )

    def teks_butir(b: ButirSoal) -> str:
        pilihan = " ".join((b.pilihan or {}).values())
        return f"{b.pertanyaan or ''} {pilihan} {b.pembahasan or ''} {cakupan_kisi.get(b.kisi_kisi_id) or ''}"

    hasil = rakit_paket(
        list(pool),
        data.jumlah_butir,
        data.distribusi_bloom,
        cakupan=data.cakupan_bab,
        target_bobot=data.target_bobot,
        teks_butir=teks_butir,
    )

    per_level: dict[str, int] = {}
    for b in hasil.terpilih:
        per_level[b.level_bloom] = per_level.get(b.level_bloom, 0) + 1
    return RakitOtomatisResponse(
        butir_ids=[b.id for b in hasil.terpilih],
        total_bobot=hasil.bobot_total,
        per_level=per_level,
        kekurangan=hasil.kekurangan,
        kurang_total=hasil.kurang_total,
        ada_cakupan=hasil.ada_cakupan,
        cocok_cakupan=hasil.cocok_cakupan,
        target_bobot=data.target_bobot,
        selisih_bobot=None if data.target_bobot is None else hasil.bobot_total - data.target_bobot,
    )


@router.post("", response_model=PaketUjianResponse, status_code=201)
async def create_ujian(
    data: PaketUjianCreate,
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    for bid in data.butir_ids:
        result = await db.execute(
            select(ButirSoal)
            .join(KisiKisi, KisiKisi.id == ButirSoal.kisi_kisi_id)
            .where(ButirSoal.id == bid, KisiKisi.guru_id == guru.id)
        )
        butir = result.scalar_one_or_none()
        if not butir:
            raise Galat(404, "ujian_butir_tidak_ditemukan", f"Butir {bid} tidak ditemukan", id=str(bid))
        if butir.status not in ("diterima", "arsip"):
            raise Galat(400, "ujian_butir_belum_diterima", f"Butir {bid} belum diterima", id=str(bid))

    paket = PaketUjian(
        guru_id=guru.id,
        judul=data.judul,
        durasi_menit=data.durasi_menit,
        status="draft",
    )
    db.add(paket)
    await db.flush()

    for i, bid in enumerate(data.butir_ids):
        item = PaketUjianButir(
            paket_ujian_id=paket.id,
            butir_id=bid,
            urutan=i + 1,
        )
        db.add(item)

    await db.commit()
    await db.refresh(paket)
    return PaketUjianResponse.model_validate(paket)


@router.get("/{ujian_id}", response_model=PaketUjianResponse)
async def get_ujian(
    ujian_id: uuid.UUID,
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(PaketUjian).where(PaketUjian.id == ujian_id))
    paket = result.scalar_one_or_none()
    if not paket:
        raise Galat(404, "ujian_tidak_ditemukan", "Ujian tidak ditemukan")
    if paket.guru_id != guru.id:
        raise Galat(403, "ujian_bukan_milik_anda", "Bukan ujian Anda")
    return PaketUjianResponse.model_validate(paket)


@router.get("/{ujian_id}/export")
async def export_ujian(
    ujian_id: uuid.UUID,
    format: str = Query("pdf", description="pdf atau docx"),
    kunci: bool = Query(False, description="Sertakan kunci jawaban dan pembahasan"),
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    if format not in ("pdf", "docx"):
        raise Galat(400, "ujian_format_ekspor_tidak_valid", "Format ekspor harus pdf atau docx")
    await pastikan_ekspor(db, guru)

    paket = (
        await db.execute(select(PaketUjian).where(PaketUjian.id == ujian_id))
    ).scalar_one_or_none()
    if not paket:
        raise Galat(404, "ujian_tidak_ditemukan", "Ujian tidak ditemukan")
    if paket.guru_id != guru.id:
        raise Galat(403, "ujian_bukan_milik_anda", "Bukan ujian Anda")

    baris = (
        await db.execute(
            select(ButirSoal)
            .join(PaketUjianButir, PaketUjianButir.butir_id == ButirSoal.id)
            .where(PaketUjianButir.paket_ujian_id == ujian_id)
            .order_by(PaketUjianButir.urutan)
        )
    ).scalars().all()

    subjudul = f"{len(baris)} butir soal  ·  {paket.durasi_menit} menit"
    isi, media = await buat_dokumen(
        format, paket.judul, list(baris), dengan_kunci=kunci, subjudul=subjudul
    )
    nama = re.sub(r"[^A-Za-z0-9_-]+", "_", paket.judul).strip("_")[:60] or "ujian"
    sufiks = "_kunci" if kunci else ""
    return StreamingResponse(
        io.BytesIO(isi),
        media_type=media,
        headers={"Content-Disposition": f'attachment; filename="{nama}{sufiks}.{format}"'},
    )


async def _ujian_milik_guru(db: AsyncSession, ujian_id: uuid.UUID, guru: User) -> PaketUjian:
    paket = (
        await db.execute(select(PaketUjian).where(PaketUjian.id == ujian_id))
    ).scalar_one_or_none()
    if not paket:
        raise Galat(404, "ujian_tidak_ditemukan", "Ujian tidak ditemukan")
    if paket.guru_id != guru.id:
        raise Galat(403, "ujian_bukan_milik_anda", "Bukan ujian Anda")
    return paket


@router.get("/{ujian_id}/peserta")
async def daftar_peserta(
    ujian_id: uuid.UUID,
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    await _ujian_milik_guru(db, ujian_id, guru)

    statistik = {
        nama: (total, int(terjawab or 0), int(terkumpul or 0), int(benar or 0))
        for nama, total, terjawab, terkumpul, benar in (
            await db.execute(
                select(
                    JawabanSiswa.nama_siswa,
                    func.count(JawabanSiswa.id),
                    func.sum(case((JawabanSiswa.jawaban_pilihan.is_not(None), 1), else_=0)),
                    func.sum(case((JawabanSiswa.submitted_at.is_not(None), 1), else_=0)),
                    func.sum(case((JawabanSiswa.benar.is_(True), 1), else_=0)),
                )
                .where(JawabanSiswa.paket_ujian_id == ujian_id)
                .group_by(JawabanSiswa.nama_siswa)
            )
        ).all()
    }
    peserta = (
        await db.execute(
            select(PesertaUjian)
            .where(PesertaUjian.paket_ujian_id == ujian_id)
            .order_by(PesertaUjian.masuk_pada)
        )
    ).scalars().all()

    hasil = []
    terdaftar = set()
    for p in peserta:
        total, terjawab, terkumpul, benar = statistik.get(p.nama_siswa, (0, 0, 0, 0))
        sudah_dikumpulkan = total > 0 and terkumpul == total
        terdaftar.add(p.nama_siswa)
        hasil.append({
            "id": str(p.id), "nama_siswa": p.nama_siswa, "masuk_pada": p.masuk_pada,
            "total_soal": total, "terjawab": terjawab, "terkumpul": sudah_dikumpulkan,
            "total_benar": benar if sudah_dikumpulkan else None,
            "nilai": round(benar / total * 100, 2) if sudah_dikumpulkan else None,
            "sesi_aktif": p.token_hash is not None, "lama": False,
        })
    for nama, (total, terjawab, terkumpul, benar) in sorted(statistik.items()):
        if nama not in terdaftar:
            sudah_dikumpulkan = total > 0 and terkumpul == total
            hasil.append({
                "id": None, "nama_siswa": nama, "masuk_pada": None, "total_soal": total,
                "terjawab": terjawab, "terkumpul": sudah_dikumpulkan,
                "total_benar": benar if sudah_dikumpulkan else None,
                "nilai": round(benar / total * 100, 2) if sudah_dikumpulkan else None,
                "sesi_aktif": False, "lama": True,
            })
    return hasil


@router.post("/{ujian_id}/peserta/{peserta_id}/lepas-sesi")
async def lepas_sesi_peserta(
    ujian_id: uuid.UUID,
    peserta_id: uuid.UUID,
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    await _ujian_milik_guru(db, ujian_id, guru)
    peserta = (
        await db.execute(
            select(PesertaUjian).where(
                PesertaUjian.id == peserta_id, PesertaUjian.paket_ujian_id == ujian_id
            )
        )
    ).scalar_one_or_none()
    if not peserta:
        raise Galat(404, "ujian_peserta_tidak_ditemukan", "Peserta tidak ditemukan")
    peserta.token_hash = None
    await db.commit()
    return {"detail": f"Sesi {peserta.nama_siswa} dilepas. Siswa dapat masuk kembali dengan nama yang sama."}


@router.put("/{ujian_id}/rilis-hasil", response_model=PaketUjianResponse)
async def atur_rilis_hasil(
    ujian_id: uuid.UUID,
    data: RilisHasilRequest,
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    paket = (
        await db.execute(select(PaketUjian).where(PaketUjian.id == ujian_id))
    ).scalar_one_or_none()
    if not paket:
        raise Galat(404, "ujian_tidak_ditemukan", "Ujian tidak ditemukan")
    if paket.guru_id != guru.id:
        raise Galat(403, "ujian_bukan_milik_anda", "Bukan ujian Anda")
    if paket.status != "aktif":
        raise Galat(409, "ujian_belum_diterbitkan", "Ujian belum diterbitkan")
    if paket.rilis_hasil != "manual":
        raise Galat(
            409, "ujian_rilis_otomatis",
            "Ujian ini memakai rilis otomatis: siswa melihat hasil begitu mengumpulkan",
        )

    paket.hasil_dirilis_pada = datetime.now(timezone.utc) if data.dirilis else None
    await db.commit()
    await db.refresh(paket)
    return PaketUjianResponse.model_validate(paket)


@router.post("/{ujian_id}/terbitkan", response_model=PaketUjianResponse)
async def terbitkan_ujian(
    ujian_id: uuid.UUID,
    data: PaketUjianTerbitkan,
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(PaketUjian).where(PaketUjian.id == ujian_id))
    paket = result.scalar_one_or_none()
    if not paket:
        raise Galat(404, "ujian_tidak_ditemukan", "Ujian tidak ditemukan")
    if paket.guru_id != guru.id:
        raise Galat(403, "ujian_bukan_milik_anda", "Bukan ujian Anda")
    if paket.status != "draft":
        raise Galat(409, "ujian_sudah_diterbitkan", "Ujian ini sudah diterbitkan")
    if data.waktu_selesai <= data.waktu_mulai:
        raise Galat(400, "ujian_waktu_selesai_sebelum_mulai", "Waktu selesai harus setelah waktu mulai")

    paket.status = "aktif"
    paket.rilis_hasil = data.rilis_hasil
    paket.hasil_dirilis_pada = None
    paket.kode_akses = secrets.token_hex(4).upper()
    paket.waktu_mulai = data.waktu_mulai
    paket.waktu_selesai = data.waktu_selesai

    await db.commit()
    await db.refresh(paket)
    return PaketUjianResponse.model_validate(paket)
