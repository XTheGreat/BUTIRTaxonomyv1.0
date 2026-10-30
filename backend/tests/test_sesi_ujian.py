import asyncio
import os
import tempfile
import uuid
from datetime import datetime, timedelta, timezone

_DB_FILE = os.path.join(tempfile.mkdtemp(), "uji_sesi_ujian.db")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_DB_FILE}"

import httpx

from app.database import Base, async_session, engine
from app.main import app
from app.models.butir_soal import ButirSoal
from app.models.kisi_kisi import KisiKisi


def iso(delta: timedelta) -> str:
    return (datetime.now(timezone.utc) + delta).isoformat()


async def _jalankan():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    try:
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://uji") as c:
            r = await c.post("/api/auth/register", json={"nama": "Guru", "email": "g@example.com", "password": "rahasia123"})
            hdr = {"Authorization": f"Bearer {r.json()['access_token']}"}
            guru = uuid.UUID(r.json()["user"]["id"])

            async with async_session() as db:
                kk = KisiKisi(guru_id=guru, jumlah_butir=2, distribusi_bloom={"C1": 100})
                db.add(kk)
                await db.flush()
                ids = []
                for kunci in ("B", "C"):
                    b = ButirSoal(kisi_kisi_id=kk.id, status="diterima", pertanyaan=f"Soal {kunci}?",
                                  pilihan={"A": "a", "B": "b", "C": "c", "D": "d"}, kunci_jawaban=kunci, level_bloom="C1")
                    db.add(b)
                    await db.flush()
                    ids.append(str(b.id))
                await db.commit()

            u = await c.post("/api/ujian", headers=hdr, json={"judul": "U", "butir_ids": ids})
            t = await c.post(f"/api/ujian/{u.json()['id']}/terbitkan", headers=hdr,
                             json={"waktu_mulai": iso(-timedelta(minutes=1)), "waktu_selesai": iso(timedelta(hours=2))})
            kode = t.json()["kode_akses"]

            r = await c.post("/api/siswa/masuk", json={"kode_akses": kode, "nama_siswa": "Budi"})
            assert r.status_code == 200, r.text
            token = r.json()["token_peserta"]
            h = {"X-Peserta-Token": token}
            q = "?nama_siswa=Budi"

            # Muat ulang di tengah ujian: masuk lagi dengan token yang sama memulihkan jawaban.
            r = await c.get(f"/api/siswa/ujian/{kode}/soal{q}", headers=h)
            assert r.json()["sudah_dikumpulkan"] is False
            r = await c.post(f"/api/siswa/ujian/{kode}/jawab{q}", headers=h, json={"butir_id": ids[0], "jawaban_pilihan": "B"})
            assert r.status_code == 200, r.text

            # Pengiriman ulang jawaban yang sama (antrian klien) tidak merusak apa pun.
            for _ in range(2):
                r = await c.post(f"/api/siswa/ujian/{kode}/jawab{q}", headers=h, json={"butir_id": ids[0], "jawaban_pilihan": "B"})
                assert r.status_code == 200, r.text
            r = await c.post(f"/api/siswa/ujian/{kode}/jawab{q}", headers=h, json={"butir_id": ids[0], "jawaban_pilihan": "C"})
            assert r.status_code == 200

            r = await c.post("/api/siswa/masuk", json={"kode_akses": kode, "nama_siswa": "budi", "token": token})
            assert r.status_code == 200 and r.json()["token_peserta"] is None
            r = await c.get(f"/api/siswa/ujian/{kode}/soal{q}", headers=h)
            assert r.json()["jawaban_tersimpan"] == {ids[0]: "C", ids[1]: None}, r.json()["jawaban_tersimpan"]
            assert r.json()["sudah_dikumpulkan"] is False

            # Pilihan di luar opsi butir ditolak sebelum menyentuh database.
            for buruk in ("Z", "E", "a"):
                r = await c.post(f"/api/siswa/ujian/{kode}/jawab{q}", headers=h, json={"butir_id": ids[1], "jawaban_pilihan": buruk})
                assert r.status_code == 422, (buruk, r.status_code, r.text)
            assert r.json()["kode"] == "siswa_pilihan_tidak_valid", r.json()
            for buruk in ("", "AB", "A" * 500):
                r = await c.post(f"/api/siswa/ujian/{kode}/jawab{q}", headers=h, json={"butir_id": ids[1], "jawaban_pilihan": buruk})
                assert r.status_code == 422, (buruk[:5], r.status_code)
            r = await c.post(f"/api/siswa/ujian/{kode}/jawab{q}", headers=h, json={"butir_id": str(uuid.uuid4()), "jawaban_pilihan": "A"})
            assert r.status_code == 404

            # Tanpa token atau dengan token orang lain, jawaban tidak bisa dikirim.
            r = await c.post(f"/api/siswa/ujian/{kode}/jawab{q}", json={"butir_id": ids[1], "jawaban_pilihan": "A"})
            assert r.status_code == 403
            r = await c.post(f"/api/siswa/ujian/{kode}/jawab{q}", headers={"X-Peserta-Token": "salah"}, json={"butir_id": ids[1], "jawaban_pilihan": "A"})
            assert r.status_code == 403
            r = await c.get(f"/api/siswa/ujian/{kode}/soal{q}")
            assert r.status_code == 403

            # Setelah dikumpulkan, sesi yang dipulihkan tahu harus ke halaman hasil, dan jawaban terkunci.
            r = await c.post(f"/api/siswa/ujian/{kode}/submit{q}", headers=h)
            assert r.status_code == 200
            r = await c.get(f"/api/siswa/ujian/{kode}/soal{q}", headers=h)
            assert r.json()["sudah_dikumpulkan"] is True
            r = await c.post(f"/api/siswa/ujian/{kode}/jawab{q}", headers=h, json={"butir_id": ids[1], "jawaban_pilihan": "A"})
            assert r.status_code == 400 and r.json()["kode"] == "siswa_jawaban_sudah_disubmit"
    finally:
        await engine.dispose()


def test_sesi_ujian():
    asyncio.run(_jalankan())


if __name__ == "__main__":
    asyncio.run(_jalankan())
    print("Semua tes sesi ujian lulus.")
