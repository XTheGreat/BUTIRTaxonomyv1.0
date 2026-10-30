from dataclasses import dataclass

from app.config import get_settings

PERAN = ("penyusun", "kritikus", "penjawab_buta", "arbiter")

KELOMPOK_PERAN = {
    "kritikus": "primer",
    "penjawab_buta": "primer",
    "penyusun": "sekunder",
    "arbiter": "sekunder",
}

PENYEDIA_DIKENAL = ("groq", "sambanova", "bankai", "advance", "vpsmurah", "openai")


class PenyediaTidakTersedia(Exception):
    pass


@dataclass(frozen=True)
class Pilihan:
    provider: str
    model: str
    kelompok: str
    fallback: bool = False
    kelompok_kunci: str = ""
    # Model cadangan di penyedia yang sama, dicoba berurutan bila model utama lambat atau gagal.
    cadangan: tuple[str, ...] = ()


def kunci_bankai(kelompok: str) -> str:
    s = get_settings()
    if kelompok == "primer" and s.BANKAI_API_KEY_PRIMER:
        return s.BANKAI_API_KEY_PRIMER
    return s.BANKAI_API_KEY


def punya_kunci(provider: str, kelompok: str = "sekunder") -> bool:
    s = get_settings()
    if provider == "groq":
        return bool(s.GROQ_API_KEY)
    if provider == "sambanova":
        return bool(s.SAMBANOVA_API_KEY)
    if provider == "bankai":
        return bool(kunci_bankai(kelompok))
    if provider == "advance":
        return bool(s.ADVANCE_API_KEY)
    if provider == "vpsmurah":
        return bool(s.VPSMURAH_API_KEY)
    if provider == "openai":
        return bool(s.get_openai_keys())
    return False


def model_untuk(provider: str, peran: str) -> str:
    nama = f"{provider.upper()}_MODEL_{peran.upper()}"
    model = getattr(get_settings(), nama, None)
    if not model:
        raise PenyediaTidakTersedia(f"Model untuk peran '{peran}' di penyedia '{provider}' belum diatur ({nama})")
    return model


def model_cadangan_untuk(provider: str, peran: str) -> tuple[str, ...]:
    """Daftar model cadangan (tanpa duplikat, tanpa model utamanya) dari pengaturan
    <PENYEDIA>_MODEL_<PERAN>_CADANGAN. Penyedia tanpa pengaturan itu tidak berpindah model."""
    nilai = getattr(get_settings(), f"{provider.upper()}_MODEL_{peran.upper()}_CADANGAN", "") or ""
    try:
        utama = model_untuk(provider, peran)
    except PenyediaTidakTersedia:
        utama = ""
    daftar = dict.fromkeys(m.strip() for m in nilai.split(",") if m.strip())
    return tuple(m for m in daftar if m != utama)


def keluarga_model(model: str) -> str:
    """Keluarga model dari namanya ("deepseek-v4-pro" -> "deepseek", "openai/gpt-oss" -> "gpt"),
    untuk menjaga agar kelompok primer dan sekunder tidak memakai keluarga yang sama."""
    return model.lower().rsplit("/", 1)[-1].split("-")[0]


def _penyedia_kelompok(kelompok: str) -> str:
    s = get_settings()
    provider = (s.PROVIDER_PRIMER if kelompok == "primer" else s.PROVIDER_SEKUNDER).lower()
    if provider not in PENYEDIA_DIKENAL:
        raise PenyediaTidakTersedia(f"Penyedia '{provider}' tidak dikenali. Pilih salah satu: {', '.join(PENYEDIA_DIKENAL)}")
    return provider


def pilih_penyedia(peran: str) -> Pilihan:
    if peran not in KELOMPOK_PERAN:
        raise PenyediaTidakTersedia(f"Peran agen tidak dikenali: {peran}")
    s = get_settings()
    kelompok = KELOMPOK_PERAN[peran]
    provider = _penyedia_kelompok(kelompok)

    if punya_kunci(provider, kelompok):
        return Pilihan(
            provider, model_untuk(provider, peran), kelompok, kelompok_kunci=kelompok,
            cadangan=model_cadangan_untuk(provider, peran),
        )

    if s.STRICT_DUA_PENYEDIA:
        raise PenyediaTidakTersedia(
            f"API key penyedia {kelompok} ({provider}) belum diisi dan STRICT_DUA_PENYEDIA aktif"
        )

    lain = "sekunder" if kelompok == "primer" else "primer"
    cadangan = _penyedia_kelompok(lain)
    if cadangan != provider and punya_kunci(cadangan, lain):
        return Pilihan(
            cadangan, model_untuk(cadangan, peran), kelompok, fallback=True, kelompok_kunci=lain,
            cadangan=model_cadangan_untuk(cadangan, peran),
        )

    raise PenyediaTidakTersedia(f"API key untuk penyedia {kelompok} ({provider}) belum diisi di backend/.env")


def periksa_konfigurasi() -> list[str]:
    s = get_settings()
    peringatan: list[str] = []
    try:
        primer, sekunder = _penyedia_kelompok("primer"), _penyedia_kelompok("sekunder")
    except PenyediaTidakTersedia as e:
        return [str(e)]

    if primer == sekunder:
        try:
            model_primer = {model_untuk(primer, r) for r, k in KELOMPOK_PERAN.items() if k == "primer"}
            model_sekunder = {model_untuk(sekunder, r) for r, k in KELOMPOK_PERAN.items() if k == "sekunder"}
        except PenyediaTidakTersedia as e:
            return [str(e)]
        sama = sorted(model_primer & model_sekunder)
        if sama:
            peringatan.append(
                f"Penyedia Primer dan Sekunder sama-sama '{primer}' dan memakai model yang sama "
                f"({', '.join(sama)}): hasil debat tidak independen."
            )
    peringatan.extend(_periksa_cadangan({"primer": primer, "sekunder": sekunder}))
    for kelompok, provider in (("primer", primer), ("sekunder", sekunder)):
        if not punya_kunci(provider, kelompok):
            akibat = "peran terkait akan gagal" if s.STRICT_DUA_PENYEDIA else "peran terkait dialihkan ke penyedia lain"
            peringatan.append(f"API key penyedia {kelompok} ({provider}) belum diisi; {akibat}.")
    return peringatan


def _periksa_cadangan(provider_kelompok: dict[str, str]) -> list[str]:
    """Model cadangan satu kelompok tidak boleh sekeluarga dengan model utama kelompok lawannya,
    kalau tidak, perpindahan model bisa menghilangkan independensi debat."""
    peringatan: list[str] = []
    for kelompok, provider in provider_kelompok.items():
        lawan = "sekunder" if kelompok == "primer" else "primer"
        try:
            keluarga_lawan = {
                keluarga_model(model_untuk(provider_kelompok[lawan], r)) for r, k in KELOMPOK_PERAN.items() if k == lawan
            }
        except PenyediaTidakTersedia:
            continue
        for peran in (r for r, k in KELOMPOK_PERAN.items() if k == kelompok):
            for model in model_cadangan_untuk(provider, peran):
                if keluarga_model(model) in keluarga_lawan:
                    peringatan.append(
                        f"Model cadangan '{model}' untuk {peran} sekeluarga dengan model utama kelompok {lawan}: "
                        "independensi debat bisa hilang bila terjadi perpindahan model."
                    )
    return peringatan
