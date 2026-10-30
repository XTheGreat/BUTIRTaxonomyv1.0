import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr, field_validator

from app.core.galat import galat_validasi
from app.core.nama import normalisasi_nama, validasi_nama_pantas


def periksa_kekuatan_password(password: str) -> str:
    if len(password) < 8:
        raise galat_validasi("validasi_sandi_pendek", "Kata sandi minimal 8 karakter")
    if not any(c.isalpha() for c in password) or not any(c.isdigit() for c in password):
        raise galat_validasi("validasi_sandi_huruf_angka", "Kata sandi harus memuat huruf dan angka")
    if len(password.encode("utf-8")) > 72:
        raise galat_validasi("validasi_sandi_panjang", "Kata sandi terlalu panjang (maksimal 72 byte)")
    return password


class UserRegister(BaseModel):
    nama: str
    email: EmailStr
    password: str

    @field_validator("nama")
    @classmethod
    def nama_pantas(cls, v: str) -> str:
        v = normalisasi_nama(v)
        if not v:
            raise galat_validasi("validasi_nama_kosong", "Nama tidak boleh kosong")
        if len(v) > 255:
            raise galat_validasi("validasi_nama_panjang", "Nama terlalu panjang (maksimal 255 karakter)")
        return validasi_nama_pantas(v)

    @field_validator("password")
    @classmethod
    def password_cukup_kuat(cls, v: str) -> str:
        return periksa_kekuatan_password(v)


class ProfilUbah(BaseModel):
    nama: str | None = None
    email: EmailStr | None = None
    # Wajib bila email berubah, sebagai konfirmasi pemilik akun.
    password_sekarang: str | None = None

    @field_validator("nama")
    @classmethod
    def rapikan_nama(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = " ".join(v.split())
        if not v:
            raise galat_validasi("validasi_nama_kosong", "Nama tidak boleh kosong")
        if len(v) > 255:
            raise galat_validasi("validasi_nama_panjang", "Nama terlalu panjang (maksimal 255 karakter)")
        return validasi_nama_pantas(v)


class PasswordUbah(BaseModel):
    password_sekarang: str
    password_baru: str

    @field_validator("password_baru")
    @classmethod
    def password_cukup_kuat(cls, v: str) -> str:
        return periksa_kekuatan_password(v)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: uuid.UUID
    nama: str
    email: str
    peran: str = "guru"
    paket: str = "gratis"
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_cukup_kuat(cls, v: str) -> str:
        return periksa_kekuatan_password(v)


class GoogleMasuk(BaseModel):
    credential: str


class KodeMinta(BaseModel):
    email: EmailStr


class KodeVerifikasi(BaseModel):
    email: EmailStr
    kode: str
    nama: str | None = None

    @field_validator("nama")
    @classmethod
    def nama_pantas(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = normalisasi_nama(v)
        if not v:
            return None
        if len(v) > 255:
            raise galat_validasi("validasi_nama_panjang", "Nama terlalu panjang (maksimal 255 karakter)")
        return validasi_nama_pantas(v)


class MetodeMasuk(BaseModel):
    google_client_id: str = ""
    kode_email: bool = True
