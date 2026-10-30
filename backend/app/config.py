from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./butir.db"
    BUAT_SKEMA_OTOMATIS: bool = True
    PAKSA_HTTPS: bool = False
    JWT_SECRET: str = "dev-secret-change-me"
    JWT_EXPIRE_MINUTES: int = 1440

    GROQ_API_KEY: str = ""
    GROQ_MODEL_PENYUSUN: str = "openai/gpt-oss-120b"
    GROQ_MODEL_KRITIKUS: str = "qwen/qwen3.8-27b"
    GROQ_MODEL_PENJAWAB_BUTA: str = "openai/gpt-oss-20b"
    GROQ_MODEL_ARBITER: str = "qwen/qwen3.8-27b"

    SAMBANOVA_API_KEY: str = ""
    SAMBANOVA_BASE_URL: str = "https://api.sambanova.ai/v1"
    SAMBANOVA_MODEL_PENYUSUN: str = "Meta-Llama-3.3-70B-Instruct"
    SAMBANOVA_MODEL_ARBITER: str = "DeepSeek-V3.1"
    SAMBANOVA_MODEL_KRITIKUS: str = "Meta-Llama-3.3-70B-Instruct"
    SAMBANOVA_MODEL_PENJAWAB_BUTA: str = "Meta-Llama-3.1-8B-Instruct"

    BANKAI_API_KEY: str = ""
    BANKAI_API_KEY_PRIMER: str = ""
    BANKAI_BASE_URL: str = "https://bankai.web.id/api"
    BANKAI_MODEL_PENYUSUN: str = "deepseek-v4-flash"
    BANKAI_MODEL_KRITIKUS: str = "glm-5.3-flashx-mod"
    BANKAI_MODEL_PENJAWAB_BUTA: str = "glm-5.3-flashx-mod"
    BANKAI_MODEL_ARBITER: str = "deepseek-v4-flash"

    VPSMURAH_API_KEY: str = ""
    VPSMURAH_BASE_URL: str = "https://my.vpsmurah.co.id/api/v1"
    VPSMURAH_MODEL_PENYUSUN: str = "fable-51"
    VPSMURAH_MODEL_KRITIKUS: str = "opus-5"
    VPSMURAH_MODEL_PENJAWAB_BUTA: str = "opus-5"
    VPSMURAH_MODEL_ARBITER: str = "fable-51"

    ADVANCE_API_KEY: str = ""
    ADVANCE_BASE_URL: str = "https://api.advance.my.id/v1"
    ADVANCE_MODEL_PENYUSUN: str = "deepseek-v4-pro"
    ADVANCE_MODEL_KRITIKUS: str = "glm-5.3-flashx-mod"
    ADVANCE_MODEL_PENJAWAB_BUTA: str = "glm-5.3-flashx-mod"
    ADVANCE_MODEL_ARBITER: str = "deepseek-v4-pro"

    OPENAI_API_KEY_1: str = ""
    OPENAI_API_KEY_2: str = ""
    OPENAI_API_KEY_3: str = ""
    OPENAI_API_KEY_4: str = ""
    OPENAI_API_KEY_5: str = ""
    OPENAI_API_KEY_6: str = ""
    OPENAI_MODEL_PENYUSUN: str = "gpt-6-luna"
    OPENAI_MODEL_KRITIKUS: str = "gpt-6-luna"
    OPENAI_MODEL_PENJAWAB_BUTA: str = "gpt-6-luna"
    OPENAI_MODEL_ARBITER: str = "gpt-6-luna"

    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""
    SMTP_USE_TLS: bool = True
    SMTP_USE_SSL: bool = False
    MAILJET_API_KEY: str = ""
    MAILJET_SECRET_KEY: str = ""
    MAILJET_FROM: str = ""
    RESEND_API_KEY: str = ""
    RESEND_FROM: str = ""
    RESET_TOKEN_EXPIRE_MINUTES: int = 30
    GOOGLE_CLIENT_ID: str = ""
    KODE_MASUK_MENIT: int = 10
    KODE_MASUK_JEDA_DETIK: int = 45
    KODE_MASUK_MAKS_PER_JAM: int = 5
    KODE_MASUK_MAKS_SALAH: int = 5

    PROVIDER_PRIMER: str = "groq"
    PROVIDER_SEKUNDER: str = "sambanova"
    STRICT_DUA_PENYEDIA: bool = False
    # Boleh beberapa alamat dipisah koma; yang pertama dipakai untuk tautan di surel.
    FRONTEND_URL: str = "http://localhost:3000"

    @property
    def frontend_urls(self) -> list[str]:
        return [u.strip().rstrip("/") for u in self.FRONTEND_URL.split(",") if u.strip()]
    ADMIN_EMAILS: str = ""

    KUOTA_AKTIF: bool = False
    PAKET_GRATIS_SOAL_BULAN: int = 20
    PAKET_GRATIS_MATERI: int = 3
    PAKET_GRATIS_EKSPOR: bool = False
    PAKET_PRO_SOAL_BULAN: int = 500
    PAKET_PRO_MATERI: int = 0
    PAKET_PRO_EKSPOR: bool = True
    HARGA_RP_PER_1000_TOKEN: float = 0.0

    MARKETPLACE_KOMISI_PERSEN: int = 10
    MAX_RONDE_DEBAT: int = 3
    BATAS_RONDE_DETIK: int = 60
    TIMEOUT_RONDE_DETIK: int = 300

    model_config = {"env_file": ".env", "extra": "ignore"}

    def get_openai_keys(self) -> list[str]:
        keys = [
            self.OPENAI_API_KEY_1,
            self.OPENAI_API_KEY_2,
            self.OPENAI_API_KEY_3,
            self.OPENAI_API_KEY_4,
            self.OPENAI_API_KEY_5,
            self.OPENAI_API_KEY_6,
        ]
        return [k for k in keys if k]


@lru_cache()
def get_settings() -> Settings:
    return Settings()
