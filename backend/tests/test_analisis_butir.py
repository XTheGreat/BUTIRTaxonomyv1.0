import asyncio
import os
import tempfile
import uuid
from datetime import datetime, timezone

_DB_FILE = os.path.join(tempfile.mkdtemp(), "uji_analisis_butir.db")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_DB_FILE}"

import httpx

from app.database import Base, async_session, engine
from app.main import app
from app.models.butir_soal import ButirSoal
from app.models.jawaban_siswa import JawabanSiswa
from app.models.kisi_kisi import KisiKisi
from app.services.analytics import (
    bagi_kelompok,
    daya_beda_kelompok,
    hitung_kr20,
    kategori_daya_beda,
    kategori_kesukaran,
    kategori_reliabilitas,
    statistik_skor,
)


def uji_fungsi_murni():
    # Skor sama diurutkan menurut nama, jadi hasil tidak bergantung pada urutan masukan.
    a = [("d", 5.0), ("b", 5.0), ("a", 5.0), ("c", 5.0)]
    assert bagi_kelompok(a) == bagi_kelompok(list(reversed(a))) == (["a", "b"], ["c", "d"])
    skor = [(f"s{i:02d}", float(i)) for i in range(10)]
    atas, bawah = bagi_kelompok(skor)
    assert atas == ["s09", "s08", "s07"] and bawah == ["s02", "s01", "s00"], (atas, bawah)

    assert daya_beda_kelompok(atas, bawah, {n: True for n in atas}) == 1.0
    assert daya_beda_kelompok(atas, bawah, {n: True for n in bawah}) == -1.0
    assert daya_beda_kelompok([], [], {}) == 0.0

    assert kategori_kesukaran(0.70) == "sedang" and kategori_kesukaran(0.71) == "mudah"
    assert kategori_kesukaran(0.30) == "sedang" and kategori_kesukaran(0.29) == "sukar"
    assert [kategori_daya_beda(d) for d in (0.40, 0.30, 0.20, 0.0, -0.01)] == [
        "sangat_baik", "baik", "cukup", "lemah", "terbalik"]
    assert [kategori_reliabilitas(r) for r in (0.9, 0.7, 0.5, 0.49)] == ["sangat_tinggi", "tinggi", "cukup", "rendah"]

    assert statistik_skor([]) is None
    s = statistik_skor([2.0, 4.0])
    assert s == {"rata_rata": 3.0, "simpangan_baku": 1.0, "median": 3.0, "minimum": 2.0, "maksimum": 4.0}

    # KR-20 tidak terdefinisi untuk satu butir, satu peserta, atau skor seragam.
    assert hitung_kr20([1.0, 2.0], [0.5]) is None
    assert hitung_kr20([1.0], [0.5, 0.5]) is None
    assert hitung_kr20([2.0, 2.0, 2.0], [0.5, 0.5]) is None
    # Dua butir yang selalu benar/salah bersamaan: reliabilitas sempurna.
    assert hitung_kr20([0.0, 2.0, 0.0, 2.0], [0.5, 0.5]) == 1.0


async def _jalankan():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    try:
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://uji") as c:
            async def daftar(n):
                r = await c.post("/api/auth/register", json={"nama": n, "email": f"{n.lower()}@example.com", "password": "rahasia123"})
                return {"Authorization": f"Bearer {r.json()['access_token']}"}, uuid.UUID(r.json()["user"]["id"])

            hdr, guru = await daftar("GuruA")
            hdr_b, _ = await daftar("GuruB")

            kunci = ["B", "C", "A", "A", "B"]
            async with async_session() as db:
                kk = KisiKisi(guru_id=guru, jumlah_butir=5, distribusi_bloom={"C1": 100})
                db.add(kk)
                await db.flush()
                ids = []
                for i, k in enumerate(kunci):
                    b = ButirSoal(kisi_kisi_id=kk.id, status="diterima", pertanyaan=f"Soal {i + 1}?", prediksi_kesukaran=0.5,
                                  pilihan={"A": "a", "B": "b", "C": "c", "D": "d"}, kunci_jawaban=k, level_bloom="C1")
                    db.add(b)
                    await db.flush()
                    ids.append(b.id)
                await db.commit()

            async def paket(butir_ids):
                u = await c.post("/api/ujian", headers=hdr, json={"judul": "U", "butir_ids": [str(i) for i in butir_ids]})
                assert u.status_code == 201, u.text
                return u.json()["id"]

            async def isi(paket_id, peserta):
                """peserta: {nama: [pilihan per butir]}; benar dihitung dari kunci."""
                async with async_session() as db:
                    for nama, pilihan in peserta.items():
                        for bid, k, p in zip(ids, kunci, pilihan):
                            db.add(JawabanSiswa(paket_ujian_id=uuid.UUID(paket_id), nama_siswa=nama, butir_id=bid,
                                                jawaban_pilihan=p, benar=(p == k), submitted_at=datetime.now(timezone.utc)))
                    await db.commit()

            # 12 peserta: s01-s06 (atas) dan s07-s12 (bawah).
            # S1: pembeda baik, pengecoh D tak terpilih. S2: kuncinya dicurigai (kelompok atas memilih D).
            # S3: semua benar. S4/S5: pembeda sempurna.
            peserta = {}
            for i in range(1, 13):
                atas = i <= 6
                bawah_s1 = ["A", "A", "A", "C", "C", "C"][i - 7] if not atas else None
                peserta[f"s{i:02d}"] = [
                    "B" if atas else bawah_s1,
                    "D" if atas else "C",
                    "A",
                    "A" if atas else "B",
                    "B" if atas else "A",
                ]
            pid = await paket(ids)
            await isi(pid, peserta)

            lap = (await c.get(f"/api/ujian/{pid}/laporan", headers=hdr)).json()
            assert lap["total_peserta"] == 12 and lap["daya_beda_dihitung"] is True
            assert lap["pengecoh_dianalisis"] is True and lap["min_peserta_pengecoh"] == 10
            assert lap["statistik_skor"] == {"rata_rata": 3.0, "simpangan_baku": 1.0, "median": 3.0, "minimum": 2.0, "maksimum": 4.0}
            assert lap["reliabilitas"] == {"kr20": 0.0, "kategori": "rendah"}, lap["reliabilitas"]

            b1, b2, b3, b4, b5 = lap["analisis_butir"]
            kode = lambda b: sorted((r["kode"], r["opsi"]) for r in b["rekomendasi"])

            assert b1["kunci_jawaban"] == "B" and b1["tingkat_kesukaran_aktual"] == 0.5 and b1["daya_beda"] == 1.0
            assert b1["kategori_daya_beda"] == "sangat_baik" and b1["kategori_kesukaran"] == "sedang"
            sebaran = {p["opsi"]: (p["dipilih"], p["atas"], p["bawah"]) for p in b1["pengecoh"]}
            assert sebaran == {"A": (3, 0, 1), "B": (6, 4, 0), "C": (3, 0, 3), "D": (0, 0, 0)}, sebaran
            assert b1["pengecoh"][1]["kunci"] is True and b1["tidak_menjawab"] == 0
            assert kode(b1) == [("pengecoh_tidak_berfungsi", "D")], kode(b1)

            # Butir 2: kelompok atas justru memilih D, kunci C dicurigai; daya beda terbalik.
            assert b2["daya_beda"] == -1.0 and b2["kategori_daya_beda"] == "terbalik"
            assert kode(b2) == sorted([("daya_beda_negatif", None), ("kunci_dicurigai", "D"),
                                        ("pengecoh_tidak_berfungsi", "A"), ("pengecoh_tidak_berfungsi", "B")]), kode(b2)

            # Butir 3: semua benar, terlalu mudah, tidak membedakan, tiga pengecoh tak berfungsi.
            assert b3["tingkat_kesukaran_aktual"] == 1.0 and b3["daya_beda"] == 0.0
            assert kode(b3) == sorted([("terlalu_mudah", None), ("daya_beda_lemah", None),
                                        ("meleset_dari_prediksi", None), ("pengecoh_tidak_berfungsi", "B"),
                                        ("pengecoh_tidak_berfungsi", "C"), ("pengecoh_tidak_berfungsi", "D")]), kode(b3)
            assert b4["daya_beda"] == 1.0 and b5["daya_beda"] == 1.0

            # Hasil sama untuk data yang sama (tidak bergantung urutan baris).
            assert (await c.get(f"/api/ujian/{pid}/laporan", headers=hdr)).json() == lap

            # Peserta sedikit: daya beda dan temuan berbasis kelompok tidak dimunculkan.
            pid2 = await paket(ids)
            await isi(pid2, {"x1": ["B", "C", "A", "A", "B"], "x2": ["A", "C", "A", "B", "A"], "x3": ["B", None, "A", "A", "B"]})
            kecil = (await c.get(f"/api/ujian/{pid2}/laporan", headers=hdr)).json()
            assert kecil["total_peserta"] == 3 and kecil["daya_beda_dihitung"] is False
            assert kecil["pengecoh_dianalisis"] is False and kecil["reliabilitas"] == {"kr20": None, "kategori": None}
            for b in kecil["analisis_butir"]:
                assert b["kategori_daya_beda"] is None and b["daya_beda"] == 0.0
                assert all(r["kode"] == "meleset_dari_prediksi" for r in b["rekomendasi"]), b["rekomendasi"]
            assert kecil["analisis_butir"][1]["tidak_menjawab"] == 1
            assert kecil["analisis_butir"][1]["pengecoh"][2]["dipilih"] == 2

            # Ujian tanpa peserta tidak membuat error.
            kosong = (await c.get(f"/api/ujian/{await paket(ids)}/laporan", headers=hdr)).json()
            assert kosong["total_peserta"] == 0 and kosong["statistik_skor"] is None
            assert kosong["analisis_butir"][0]["kategori_kesukaran"] is None

            # Hanya pemilik ujian yang boleh melihat laporan.
            assert (await c.get(f"/api/ujian/{pid}/laporan", headers=hdr_b)).status_code == 403
            assert (await c.get(f"/api/ujian/{uuid.uuid4()}/laporan", headers=hdr)).status_code == 404
            assert (await c.get(f"/api/ujian/{pid}/laporan")).status_code in (401, 403)
    finally:
        await engine.dispose()


def test_analisis_butir():
    uji_fungsi_murni()
    asyncio.run(_jalankan())


if __name__ == "__main__":
    uji_fungsi_murni()
    asyncio.run(_jalankan())
    print("Semua tes analisis butir lulus.")
