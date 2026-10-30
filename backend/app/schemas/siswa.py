import uuid
from datetime import datetime
from pydantic import BaseModel, Field, field_validator

from app.core.galat import galat_validasi
from app.core.nama import validasi_nama_pantas


class SiswaMasukRequest(BaseModel):
    kode_akses: str
    nama_siswa: str = Field(min_length=1, max_length=100)
    token: str | None = Field(default=None, max_length=200)

    @field_validator("nama_siswa")
    @classmethod
    def rapikan_nama(cls, v: str) -> str:
        v = " ".join(v.split())
        if not v:
            raise galat_validasi("validasi_siswa_nama_kosong", "Nama tidak boleh kosong")
        return validasi_nama_pantas(v)


class SiswaMasukResponse(BaseModel):
    paket_ujian_id: uuid.UUID
    nama_siswa: str
    judul_ujian: str
    durasi_menit: int
    waktu_selesai: datetime | None
    token_peserta: str | None = None


class JawabanSimpan(BaseModel):
    butir_id: uuid.UUID
    jawaban_pilihan: str = Field(min_length=1, max_length=1)


class HasilUjianResponse(BaseModel):
    nama_siswa: str
    judul_ujian: str
    total_soal: int
    total_benar: int
    skor: float
    detail: list[dict]
