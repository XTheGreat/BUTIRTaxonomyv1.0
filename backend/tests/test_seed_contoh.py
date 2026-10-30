import asyncio
import os
import sys
import tempfile
from pathlib import Path

_DB_FILE = os.path.join(tempfile.mkdtemp(), "uji_seed_contoh.db")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_DB_FILE}"
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

import httpx
from sqlalchemy import func, select

import seed_contoh_analisis as seed
from app.database import Base, async_session, engine
from app.main import app
from app.models.butir_soal import ButirSoal
from app.models.jawaban_siswa import JawabanSiswa
from app.models.kisi_kisi import KisiKisi
from app.models.paket_ujian import PaketUjian
from app.models.user import User


async def _hitung(model):
    async with async_session() as db:
        return (await db.execute(select(func.count()).select_from(model))).scalar_one()


async def _jalankan():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    try:
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://uji") as c:
            r = await c.post("/api/auth/register", json={"nama": "Guru", "email": "g@example.com", "password": "rahasia123"})
            hdr = {"Authorization": f"Bearer {r.json()['access_token']}"}
            async with async_session() as db:
                guru = (await db.execute(select(User))).scalar_one()

            await seed.buat_contoh(guru)
            assert await _hitung(ButirSoal) == len(seed.BUTIR) and await _hitung(JawabanSiswa) == len(seed.BUTIR) * seed.JUMLAH_PESERTA
            async with async_session() as db:
                paket = (await db.execute(select(PaketUjian))).scalar_one()
            assert paket.judul.startswith(seed.PENANDA)

            lap = (await c.get(f"/api/ujian/{paket.id}/laporan", headers=hdr)).json()
            assert lap["total_peserta"] == seed.JUMLAH_PESERTA and lap["pengecoh_dianalisis"] is True
            kode = {i: {(t["kode"], t["opsi"]) for t in b["rekomendasi"]} for i, b in enumerate(lap["analisis_butir"], 1)}
            assert ("terlalu_mudah", None) in kode[2] and ("terlalu_sukar", None) in kode[3]
            assert ("kunci_dicurigai", "D") in kode[4] and ("daya_beda_negatif", None) in kode[4]
            assert {("pengecoh_tidak_berfungsi", "A"), ("pengecoh_tidak_berfungsi", "D")} <= kode[5]
            assert not kode[1] and not kode[13], "butir yang baik tidak boleh ditandai"

            # Dijalankan dua kali tidak menggandakan data.
            await seed.buat_contoh(guru)
            assert await _hitung(PaketUjian) == 1

            await seed.hapus_contoh(guru)
            for model in (PaketUjian, KisiKisi, ButirSoal, JawabanSiswa):
                assert await _hitung(model) == 0, model
    finally:
        await engine.dispose()


def test_seed_contoh():
    asyncio.run(_jalankan())


if __name__ == "__main__":
    asyncio.run(_jalankan())
    print("Semua tes data contoh lulus.")
