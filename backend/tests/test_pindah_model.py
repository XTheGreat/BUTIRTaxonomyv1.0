import asyncio
import json
import os
import tempfile
import uuid
from types import SimpleNamespace

_DB_FILE = os.path.join(tempfile.mkdtemp(), "uji_pindah_model.db")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_DB_FILE}"

import httpx
from sqlalchemy import delete, select

import app.services.agents.base as base
from app.config import get_settings
from app.database import Base, async_session, engine
from app.main import app  # noqa: F401  (mendaftarkan semua model sebelum membuat tabel)
from app.models.log_llm import LogLLM
from app.services.agents.base import AgentCallFailed, konteks_llm, panggil_llm
from app.services.agents.penyedia import keluarga_model, model_cadangan_untuk, periksa_konfigurasi, pilih_penyedia

UTAMA_SEKUNDER, CAD_SEKUNDER_1, CAD_SEKUNDER_2 = "deepseek-v4-pro", "deepseek-v4-pro-0813", "kimi-k2.8"
UTAMA_PRIMER, CAD_PRIMER_1, CAD_PRIMER_2 = "glm-5.3-flashx-mod", "glm-5.3-flash", "mimo-v2.6-pro"
B1, B2, B3 = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()


def _ok(isi=None):
    return httpx.Response(200, json={
        "choices": [{"message": {"content": json.dumps(isi or {"ok": True})}}],
        "usage": {"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": 2},
    })


class ServerPalsu:
    """Jawaban diatur per nama model; model tanpa antrian menjawab sukses."""

    def __init__(self):
        self.model_diminta: list[str] = []
        self.antrean: dict[str, list] = {}

    def atur(self, model: str, *respons):
        self.antrean[model] = list(respons)

    def __call__(self, request: httpx.Request):
        model = json.loads(request.content)["model"]
        self.model_diminta.append(model)
        antre = self.antrean.get(model, [])
        item = antre.pop(0) if len(antre) > 1 else (antre[0] if antre else _ok())
        if isinstance(item, Exception):
            raise item
        return item

    def reset(self):
        self.model_diminta.clear()
        self.antrean.clear()


async def _log():
    async with async_session() as db:
        return (await db.execute(select(LogLLM).order_by(LogLLM.waktu, LogLLM.percobaan_panggilan))).scalars().all()


async def _kosongkan():
    async with async_session() as db:
        await db.execute(delete(LogLLM))
        await db.commit()
    base._model_sakit.clear()
    base._model_butir.clear()
    base._keluarga_butir.clear()


async def _jalankan():
    s = get_settings()
    kunci = ("ADVANCE_API_KEY", "PROVIDER_PRIMER", "PROVIDER_SEKUNDER", "STRICT_DUA_PENYEDIA", "LLM_GAGAL_SEBELUM_PINDAH",
             "LLM_MODEL_SAKIT_DETIK", "ADVANCE_MODEL_PENYUSUN", "ADVANCE_MODEL_KRITIKUS", "ADVANCE_MODEL_PENYUSUN_CADANGAN",
             "ADVANCE_MODEL_KRITIKUS_CADANGAN", "ADVANCE_MODEL_ARBITER_CADANGAN", "ADVANCE_MODEL_PENJAWAB_BUTA_CADANGAN")
    asli = {k: getattr(s, k) for k in kunci}
    s.ADVANCE_API_KEY, s.PROVIDER_PRIMER, s.PROVIDER_SEKUNDER, s.STRICT_DUA_PENYEDIA = "kunci-advance", "advance", "advance", False
    s.LLM_GAGAL_SEBELUM_PINDAH, s.LLM_MODEL_SAKIT_DETIK = 2, 300
    s.ADVANCE_MODEL_PENYUSUN, s.ADVANCE_MODEL_KRITIKUS = UTAMA_SEKUNDER, UTAMA_PRIMER
    s.ADVANCE_MODEL_PENYUSUN_CADANGAN = f"{CAD_SEKUNDER_1}, {CAD_SEKUNDER_2},{CAD_SEKUNDER_1},{UTAMA_SEKUNDER}"
    s.ADVANCE_MODEL_KRITIKUS_CADANGAN = f"{CAD_PRIMER_1},{CAD_PRIMER_2}"
    s.ADVANCE_MODEL_ARBITER_CADANGAN = f"{CAD_SEKUNDER_1},{CAD_SEKUNDER_2}"
    s.ADVANCE_MODEL_PENJAWAB_BUTA_CADANGAN = f"{CAD_PRIMER_1},{CAD_PRIMER_2}"

    server = ServerPalsu()
    tidur: list[float] = []

    async def tidur_palsu(detik):
        tidur.append(detik)

    base.asyncio = SimpleNamespace(sleep=tidur_palsu)
    base._buat_client = lambda timeout: httpx.AsyncClient(transport=httpx.MockTransport(server))

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        # Daftar cadangan: tanpa duplikat dan tanpa model utamanya; keluarga dibaca dari nama.
        assert model_cadangan_untuk("advance", "penyusun") == (CAD_SEKUNDER_1, CAD_SEKUNDER_2)
        assert model_cadangan_untuk("groq", "penyusun") == ()
        assert pilih_penyedia("kritikus").cadangan == (CAD_PRIMER_1, CAD_PRIMER_2)
        assert [keluarga_model(m) for m in ("deepseek-v4-pro", "openai/gpt-oss-120b", "kimi-k2.8", "GLM-5.3")] == [
            "deepseek", "gpt", "kimi", "glm"]
        assert periksa_konfigurasi() == []
        s.ADVANCE_MODEL_PENYUSUN_CADANGAN = f"{CAD_PRIMER_1},{CAD_SEKUNDER_2}"
        assert any("sekeluarga" in w and CAD_PRIMER_1 in w for w in periksa_konfigurasi())
        s.ADVANCE_MODEL_PENYUSUN_CADANGAN = f"{CAD_SEKUNDER_1},{CAD_SEKUNDER_2}"

        # 1. Dua timeout berturut-turut di model utama: pindah ke cadangan pertama tanpa menunggu lagi.
        await _kosongkan()
        konteks_llm.set({"guru_id": None, "butir_id": None, "percobaan_ke": 1, "ronde": 1})
        server.atur(UTAMA_SEKUNDER, httpx.ReadTimeout("lambat"))
        tidur.clear()
        assert await panggil_llm("penyusun", "s", "u") == {"ok": True}
        assert server.model_diminta == [UTAMA_SEKUNDER, UTAMA_SEKUNDER, CAD_SEKUNDER_1]
        assert len(tidur) == 1, "hanya satu jeda (setelah kegagalan pertama); saat pindah tidak menunggu"
        baris = await _log()
        assert [(b.model, b.status, b.fallback) for b in baris] == [
            (UTAMA_SEKUNDER, "timeout", False), (UTAMA_SEKUNDER, "timeout", False), (CAD_SEKUNDER_1, "sukses", True)]

        # 2. Model yang baru ditinggalkan dilewati (butir lain langsung ke cadangan), lalu kembali setelah masa sakit.
        server.reset()
        assert await panggil_llm("arbiter", "s", "u") == {"ok": True}
        assert server.model_diminta == [CAD_SEKUNDER_1]
        base._model_sakit.clear()
        server.reset()
        server.atur(UTAMA_SEKUNDER, _ok())
        await panggil_llm("arbiter", "s", "u")
        assert server.model_diminta == [UTAMA_SEKUNDER]

        # 3. Satu butir tetap memakai model yang sama untuk peran itu walau model utama sudah pulih.
        await _kosongkan()
        konteks_llm.set({"guru_id": None, "butir_id": B1, "percobaan_ke": 1, "ronde": 1})
        server.reset()
        server.atur(UTAMA_SEKUNDER, httpx.ConnectError("putus"))
        await panggil_llm("penyusun", "s", "u")
        assert server.model_diminta[-1] == CAD_SEKUNDER_1
        base._model_sakit.clear()
        server.reset()
        await panggil_llm("penyusun", "s", "u")
        assert server.model_diminta == [CAD_SEKUNDER_1], "konsisten dalam satu butir"
        konteks_llm.set({"guru_id": None, "butir_id": B2, "percobaan_ke": 1, "ronde": 1})
        server.reset()
        await panggil_llm("penyusun", "s", "u")
        assert server.model_diminta == [UTAMA_SEKUNDER], "butir lain tidak ikut terpengaruh"

        # 4. Independensi: setelah kelompok primer memakai keluarga GLM pada butir ini, cadangan sekunder
        #    yang sekeluarga (GLM) dilewati.
        await _kosongkan()
        konteks_llm.set({"guru_id": None, "butir_id": B3, "percobaan_ke": 1, "ronde": 1})
        await panggil_llm("kritikus", "s", "u")
        s.ADVANCE_MODEL_PENYUSUN_CADANGAN = f"{CAD_PRIMER_1},{CAD_SEKUNDER_2}"
        assert base._urutan_model(pilih_penyedia("penyusun"), "penyusun", B3) == [UTAMA_SEKUNDER, CAD_SEKUNDER_2]
        assert base._urutan_model(pilih_penyedia("penyusun"), "penyusun", uuid.uuid4()) == [
            UTAMA_SEKUNDER, CAD_PRIMER_1, CAD_SEKUNDER_2]
        s.ADVANCE_MODEL_PENYUSUN_CADANGAN = f"{CAD_SEKUNDER_1},{CAD_SEKUNDER_2}"

        # 5. Semua model gagal: habis dalam jumlah percobaan terbatas lalu AgentCallFailed (butir tertunda).
        await _kosongkan()
        konteks_llm.set({"guru_id": None, "butir_id": None, "percobaan_ke": 1, "ronde": 1})
        server.reset()
        for m in (UTAMA_SEKUNDER, CAD_SEKUNDER_1, CAD_SEKUNDER_2):
            server.atur(m, httpx.Response(503, text="mati"))
        try:
            await panggil_llm("penyusun", "s", "u")
            raise AssertionError("seharusnya gagal")
        except AgentCallFailed as e:
            assert CAD_SEKUNDER_2 in str(e) and "HTTP 503" in str(e)
        assert server.model_diminta == [UTAMA_SEKUNDER] * 2 + [CAD_SEKUNDER_1] * 2 + [CAD_SEKUNDER_2] * 5, server.model_diminta

        # 6. Model menolak permintaan (404/400): langsung coba model lain tanpa mengulang.
        await _kosongkan()
        server.reset()
        server.atur(UTAMA_SEKUNDER, httpx.Response(404, text="model tidak ada"))
        assert await panggil_llm("penyusun", "s", "u") == {"ok": True}
        assert server.model_diminta == [UTAMA_SEKUNDER, CAD_SEKUNDER_1]

        # 7. Masalah akun (401/402): berpindah model tidak menolong, jadi berhenti seperti sebelumnya.
        for kode in (401, 402):
            await _kosongkan()
            server.reset()
            server.atur(UTAMA_SEKUNDER, httpx.Response(kode, text="akun"))
            try:
                await panggil_llm("penyusun", "s", "u")
                raise AssertionError("seharusnya gagal")
            except AgentCallFailed:
                pass
            assert server.model_diminta == [UTAMA_SEKUNDER], kode

        # 8. Rate limit baru memicu pindah setelah tiga kali (satu lebih dari ambang).
        await _kosongkan()
        server.reset()
        server.atur(UTAMA_SEKUNDER, httpx.Response(429, headers={"retry-after": "1"}, text="pelan"))
        await panggil_llm("penyusun", "s", "u")
        assert server.model_diminta == [UTAMA_SEKUNDER] * 3 + [CAD_SEKUNDER_1]

        # 9. Jawaban terpotong (token habis) bukan tanda model rusak: diulang di model yang sama.
        await _kosongkan()
        server.reset()
        potong = httpx.Response(200, json={"choices": [{"message": {"content": ""}, "finish_reason": "length"}], "usage": {}})
        server.atur(UTAMA_SEKUNDER, potong, potong, _ok())
        assert await panggil_llm("penyusun", "s", "u") == {"ok": True}
        assert server.model_diminta == [UTAMA_SEKUNDER] * 3

        # 10. JSON tidak valid dua kali dianggap model bermasalah dan dipindah.
        await _kosongkan()
        server.reset()
        server.atur(UTAMA_SEKUNDER, httpx.Response(200, json={"choices": [{"message": {"content": "bukan json"}}], "usage": {}}))
        await panggil_llm("penyusun", "s", "u")
        assert server.model_diminta == [UTAMA_SEKUNDER] * 2 + [CAD_SEKUNDER_1]

        # 11. Tanpa cadangan (pengaturan kosong), perilaku lama: mengulang model yang sama sampai habis.
        await _kosongkan()
        s.ADVANCE_MODEL_PENYUSUN_CADANGAN = ""
        server.reset()
        server.atur(UTAMA_SEKUNDER, httpx.Response(503, text="mati"))
        try:
            await panggil_llm("penyusun", "s", "u")
            raise AssertionError("seharusnya gagal")
        except AgentCallFailed:
            pass
        assert server.model_diminta == [UTAMA_SEKUNDER] * 5
    finally:
        for k, v in asli.items():
            setattr(s, k, v)
        await engine.dispose()


def test_pindah_model():
    asyncio.run(_jalankan())


if __name__ == "__main__":
    asyncio.run(_jalankan())
    print("Semua tes pindah model lulus.")
