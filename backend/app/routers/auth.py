import hmac
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete, func, select
from app.config import get_settings
from app.core.deps import get_current_guru
from app.core.galat import Galat
from app.core.nama import nama_tidak_pantas, normalisasi_nama
from app.database import get_db
from app.models.kode_masuk import KodeMasuk
from app.models.token_dicabut import TokenDicabut
from app.models.user import User
from app.services.admin import email_admin
from app.services.google_masuk import verifikasi_token_google
from app.services.surel import kirim_email_kode, kirim_email_reset
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    ProfilUbah,
    PasswordUbah,
    UserResponse,
    TokenResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    GoogleMasuk,
    KodeMinta,
    KodeVerifikasi,
    MetodeMasuk,
)
from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    hash_token,
    sidik_password,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise Galat(400, "email_sudah_terdaftar", "Email sudah terdaftar")

    user = User(
        nama=data.nama,
        email=data.email,
        password_hash=hash_password(data.password),
        peran="admin" if email_admin(data.email) else "guru",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(data.password, user.password_hash):
        raise Galat(401, "kredensial_salah", "Email atau password salah")

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.patch("/saya", response_model=UserResponse)
async def ubah_profil(
    data: ProfilUbah,
    user: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    if data.nama is not None:
        user.nama = data.nama

    if data.email is not None and data.email.lower() != user.email.lower():
        if not data.password_sekarang or not verify_password(data.password_sekarang, user.password_hash):
            raise Galat(400, "akun_password_salah", "Kata sandi saat ini salah")
        dipakai = await db.execute(
            select(User.id).where(func.lower(User.email) == data.email.lower(), User.id != user.id)
        )
        if dipakai.first():
            raise Galat(400, "email_sudah_terdaftar", "Email sudah terdaftar")
        user.email = data.email

    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.post("/ganti-password")
async def ganti_password(
    data: PasswordUbah,
    user: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(data.password_sekarang, user.password_hash):
        raise Galat(400, "akun_password_salah", "Kata sandi saat ini salah")
    if data.password_sekarang == data.password_baru:
        raise Galat(400, "akun_password_sama", "Kata sandi baru harus berbeda dari yang lama")
    user.password_hash = hash_password(data.password_baru)
    await db.commit()
    return {"detail": "Kata sandi berhasil diganti"}


@router.post("/logout")
async def logout(
    credentials: HTTPAuthorizationCredentials | None = Depends(HTTPBearer(auto_error=False)),
    db: AsyncSession = Depends(get_db),
):
    sekarang = datetime.now(timezone.utc)
    await db.execute(delete(TokenDicabut).where(TokenDicabut.kedaluwarsa < sekarang))

    payload = decode_access_token(credentials.credentials) if credentials else None
    if payload and payload.get("exp"):
        sidik = hash_token(credentials.credentials)
        sudah = await db.execute(select(TokenDicabut).where(TokenDicabut.token_hash == sidik))
        if not sudah.scalar_one_or_none():
            db.add(
                TokenDicabut(
                    token_hash=sidik,
                    kedaluwarsa=datetime.fromtimestamp(payload["exp"], tz=timezone.utc),
                )
            )
    await db.commit()
    return {"detail": "Berhasil keluar"}


@router.post("/forgot-password")
async def forgot_password(
    data: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    settings = get_settings()
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if user:
        token = create_access_token(
            {"sub": str(user.id), "type": "reset", "ph": sidik_password(user.password_hash)},
            expire_minutes=settings.RESET_TOKEN_EXPIRE_MINUTES,
        )
        tautan = f"{settings.frontend_urls[0]}/reset-password?token={token}"
        background_tasks.add_task(
            kirim_email_reset, user.email, tautan, settings.RESET_TOKEN_EXPIRE_MINUTES
        )
    return {"detail": "Jika email terdaftar, tautan untuk mengatur ulang kata sandi akan dikirim"}


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    galat = Galat(
        400, "tautan_reset_tidak_valid", "Tautan reset tidak valid, sudah dipakai, atau kedaluwarsa"
    )
    payload = decode_access_token(data.token)
    if not payload or payload.get("type") != "reset":
        raise galat

    try:
        user_id = uuid.UUID(payload["sub"])
    except (KeyError, ValueError):
        raise galat
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user or payload.get("ph") != sidik_password(user.password_hash):
        raise galat

    user.password_hash = hash_password(data.new_password)
    await db.commit()
    return {"detail": "Password berhasil direset"}


def _sesi(user: User) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token({"sub": str(user.id)}),
        user=UserResponse.model_validate(user),
    )


async def _cari_atau_buat(db: AsyncSession, email: str, nama: str) -> User:
    email = email.strip().lower()
    user = (await db.execute(select(User).where(func.lower(User.email) == email))).scalar_one_or_none()
    if user:
        return user
    nama = normalisasi_nama(nama or "") or email.split("@", 1)[0]
    if nama_tidak_pantas(nama):
        nama = email.split("@", 1)[0]
        if nama_tidak_pantas(nama):
            nama = "Pengguna"
    user = User(
        nama=nama,
        email=email,
        password_hash=hash_password(secrets.token_urlsafe(24)),
        peran="admin" if email_admin(email) else "guru",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/metode", response_model=MetodeMasuk)
async def metode_masuk():
    return MetodeMasuk(google_client_id=get_settings().GOOGLE_CLIENT_ID)


@router.post("/google", response_model=TokenResponse)
async def masuk_google(data: GoogleMasuk, db: AsyncSession = Depends(get_db)):
    klaim = await verifikasi_token_google(data.credential)
    if not klaim:
        raise Galat(401, "masuk_google_gagal", "Masuk dengan Google gagal. Coba lagi.")
    return _sesi(await _cari_atau_buat(db, klaim["email"], klaim["nama"]))


def _sidik_kode(email: str, kode: str) -> str:
    return hash_token(f"{email}:{kode}")


@router.post("/kode/minta")
async def minta_kode(data: KodeMinta, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    s = get_settings()
    email = data.email.strip().lower()
    sekarang = datetime.now(timezone.utc)
    await db.execute(delete(KodeMasuk).where(KodeMasuk.kedaluwarsa < sekarang))

    terbaru = (
        await db.execute(select(func.max(KodeMasuk.dibuat_pada)).where(KodeMasuk.email == email))
    ).scalar()
    if terbaru and sekarang - terbaru < timedelta(seconds=s.KODE_MASUK_JEDA_DETIK):
        raise Galat(429, "kode_baru_dikirim", "Kode baru saja dikirim. Tunggu sebentar sebelum meminta lagi.")
    sejam = (
        await db.execute(
            select(func.count(KodeMasuk.id)).where(
                KodeMasuk.email == email, KodeMasuk.dibuat_pada > sekarang - timedelta(hours=1)
            )
        )
    ).scalar() or 0
    if sejam >= s.KODE_MASUK_MAKS_PER_JAM:
        raise Galat(429, "kode_terlalu_sering", "Terlalu banyak permintaan kode. Coba lagi dalam satu jam.")

    kode = f"{secrets.randbelow(1_000_000):06d}"
    db.add(
        KodeMasuk(
            email=email,
            kode_hash=_sidik_kode(email, kode),
            kedaluwarsa=sekarang + timedelta(minutes=s.KODE_MASUK_MENIT),
        )
    )
    await db.commit()
    background_tasks.add_task(kirim_email_kode, email, kode, s.KODE_MASUK_MENIT)
    return {"detail": "Jika alamat email benar, kode masuk akan dikirim", "berlaku_menit": s.KODE_MASUK_MENIT}


@router.post("/kode/verifikasi", response_model=TokenResponse)
async def verifikasi_kode(data: KodeVerifikasi, db: AsyncSession = Depends(get_db)):
    s = get_settings()
    galat = Galat(400, "kode_salah", "Kode salah atau sudah kedaluwarsa")
    email = data.email.strip().lower()
    kode = data.kode.strip().replace(" ", "")
    sekarang = datetime.now(timezone.utc)

    baris = (
        await db.execute(
            select(KodeMasuk)
            .where(KodeMasuk.email == email, KodeMasuk.kedaluwarsa > sekarang)
            .order_by(KodeMasuk.dibuat_pada.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    if not baris or baris.percobaan >= s.KODE_MASUK_MAKS_SALAH:
        raise galat
    if not hmac.compare_digest(baris.kode_hash, _sidik_kode(email, kode)):
        baris.percobaan += 1
        await db.commit()
        raise galat

    await db.execute(delete(KodeMasuk).where(KodeMasuk.email == email))
    await db.commit()
    return _sesi(await _cari_atau_buat(db, email, data.nama or ""))
