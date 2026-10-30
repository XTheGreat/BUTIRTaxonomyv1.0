import asyncio
import os
import tempfile
import uuid

_DB_FILE = os.path.join(tempfile.mkdtemp(), "uji_arsip.db")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_DB_FILE}"

import httpx

from app.database import Base, async_session, engine
from app.main import app
from app.models.butir_soal import ButirSoal
from app.models.debat_log import DebatLog
from app.models.kisi_kisi import KisiKisi

DRAF = {
    "pertanyaan": "Soal arsip?",
    "pilihan": {"A": "a", "B": "b", "C": "c", "D": "d"},
    "kunci_jawaban": "B",
    "pembahasan": "Bahas",
    "level_bloom_usulan": "C3",
}


async def _butir(kisi_id, status, verdict, ronde_akhir=1):
    async with async_session() as db:
        b = ButirSoal(kisi_kisi_id=kisi_id, status=status, ronde_saat_ini=ronde_akhir, level_bloom="C3", pertanyaan="x")
        db.add(b)
        await db.flush()
        for ronde in range(1, ronde_akhir + 1):
            v = verdict if ronde == ronde_akhir else "revisi"
            draf = {**DRAF, "pertanyaan": f"Soal ronde {ronde}?"}
            db.add(DebatLog(butir_id=b.id, percobaan_ke=1, ronde=ronde, agen="penyusun", output_json=draf))
            db.add(DebatLog(butir_id=b.id, percobaan_ke=1, ronde=ronde, agen="penjawab_buta",
                            output_json={"jawaban_pilihan": "C", "tingkat_keyakinan": 4}))
            db.add(DebatLog(butir_id=b.id, percobaan_ke=1, ronde=ronde, agen="arbiter", output_json={"verdict": v}))
        await db.commit()
        return b.id


async def _jalankan():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    try:
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://uji") as c:
            r = await c.post("/api/auth/register", json={"nama": "Guru", "email": "g@example.com", "password": "rahasia123"})
            hdr = {"Authorization": f"Bearer {r.json()['access_token']}"}
            guru_id = uuid.UUID(r.json()["user"]["id"])
            async with async_session() as db:
                kk = KisiKisi(guru_id=guru_id, jumlah_butir=3, distribusi_bloom={"C3": 100})
                db.add(kk)
                await db.commit()
                kisi_id = kk.id

            for status, verdict in (("ditandai", "revisi"), ("tertunda", "revisi"), ("debating", "revisi")):
                bid = await _butir(kisi_id, status, verdict, 2)
                r = await c.post("/api/arsip", json={"butir_id": str(bid), "ronde": 1}, headers=hdr)
                assert r.status_code == 409, (status, r.text)

            diterima = await _butir(kisi_id, "diterima", "diterima", 3)

            r = await c.post("/api/arsip", json={"butir_id": str(diterima), "ronde": 3}, headers=hdr)
            assert r.status_code == 409, "ronde penentu butir diterima tidak boleh diarsipkan"

            r = await c.post("/api/arsip", json={"butir_id": str(diterima), "ronde": 2}, headers=hdr)
            assert r.status_code == 201, r.text
            a = r.json()
            assert a["pertanyaan"] == "Soal ronde 2?" and a["kunci_jawaban"] == "B"
            assert a["jawaban_penjawab_buta"] == "C" and a["asal_status"] == "diterima" and a["ronde"] == 2

            r = await c.post("/api/arsip", json={"butir_id": str(diterima), "ronde": 2}, headers=hdr)
            assert r.status_code == 409, "tidak boleh dobel"
            r = await c.post("/api/arsip", json={"butir_id": str(diterima), "ronde": 9}, headers=hdr)
            assert r.status_code == 409

            daftar = (await c.get("/api/arsip", headers=hdr)).json()
            assert [x["id"] for x in daftar] == [a["id"]]
            assert all(b["status"] != "arsip" for b in (await c.get("/api/butir", headers=hdr)).json())
            assert [b["id"] for b in (await c.get("/api/bank-soal", headers=hdr)).json()] == [str(diterima)]
            assert [b["id"] for b in (await c.get("/api/butir/diterima", headers=hdr)).json()] == [str(diterima)]

            r = await c.post("/api/marketplace/listing", headers=hdr, json={
                "judul": "Paket", "deskripsi": "d" * 20, "harga_rp": 0, "butir_ids": [a["id"]]})
            assert r.status_code == 422 and "Arsip" in r.json()["detail"], r.text

            r = await c.post("/api/ujian", headers=hdr, json={"judul": "Ujian", "durasi_menit": 30, "butir_ids": [a["id"], str(diterima)]})
            assert r.status_code == 201, r.text

            r = await c.delete(f"/api/arsip/{a['id']}", headers=hdr)
            assert r.status_code == 409, "arsip yang dipakai ujian tidak bisa dihapus"

            ditolak = await _butir(kisi_id, "ditolak", "ditolak", 2)
            assert [b["id"] for b in (await c.get("/api/butir/ditolak", headers=hdr)).json()] == [str(ditolak)]
            r = await c.post("/api/arsip", json={"butir_id": str(ditolak), "ronde": 1}, headers=hdr)
            assert r.status_code == 201, r.text
            assert r.json()["asal_status"] == "ditolak"
            r = await c.post("/api/arsip", json={"butir_id": str(ditolak), "ronde": 1}, headers=hdr)
            assert r.status_code == 409, "arsip dari butir ditolak tidak boleh dobel"
    finally:
        await engine.dispose()


def test_arsip():
    asyncio.run(_jalankan())


if __name__ == "__main__":
    asyncio.run(_jalankan())
    print("Semua tes arsip lulus.")
