import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.core.galat import Galat, tangani_galat
from app.core.keamanan import pasang_keamanan, periksa_rahasia_produksi
from app.routers import auth, materi, kisi_kisi, generasi, butir, bank_soal, ujian, siswa, laporan, log_llm, paket, institusi, marketplace, arsip
from app.database import engine, Base, tambah_kolom_yang_hilang
from app.services.agents.orchestrator import pulihkan_proses_terputus
from app.services.agents.penyedia import periksa_konfigurasi
from app.services.admin import promosikan_admin

import app.models.institusi
import app.models.marketplace
import app.models.user
import app.models.token_dicabut
import app.models.log_llm
import app.models.peserta_ujian
import app.models.materi
import app.models.kisi_kisi
import app.models.butir_soal
import app.models.debat_log
import app.models.riwayat_percobaan
import app.models.paket_ujian
import app.models.jawaban_siswa

settings = get_settings()

app = FastAPI(title="BUTIR API", version="1.0.0")
pasang_keamanan(app, settings.PAKSA_HTTPS)
app.add_exception_handler(Galat, tangani_galat)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[*settings.frontend_urls, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(materi.router)
app.include_router(kisi_kisi.router)
app.include_router(generasi.router)
app.include_router(butir.router)
app.include_router(bank_soal.router)
app.include_router(ujian.router)
app.include_router(siswa.router)
app.include_router(laporan.router)
app.include_router(log_llm.router)
app.include_router(paket.router)
app.include_router(institusi.router)
app.include_router(marketplace.router)
app.include_router(arsip.router)


@app.on_event("startup")
async def startup():
    periksa_rahasia_produksi(settings.JWT_SECRET, settings.PAKSA_HTTPS)
    if settings.JWT_SECRET == "dev-secret-change-me":
        logging.getLogger(__name__).warning(
            "JWT_SECRET masih memakai nilai bawaan. Isi JWT_SECRET dengan string acak "
            "panjang di backend/.env sebelum dipakai di luar development."
        )
    for peringatan in periksa_konfigurasi():
        logging.getLogger(__name__).warning("Konfigurasi LLM: %s", peringatan)
    if settings.BUAT_SKEMA_OTOMATIS:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            await conn.run_sync(tambah_kolom_yang_hilang)
    await promosikan_admin()
    await pulihkan_proses_terputus()


@app.get("/")
async def root():
    return {"message": "BUTIR API v1.0"}

