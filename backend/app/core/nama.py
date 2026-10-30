import re
import unicodedata

from app.core.galat import galat_validasi


_PENGGANTI_LEET = str.maketrans({
    "0": "o",
    "1": "i",
    "3": "e",
    "4": "a",
    "5": "s",
    "7": "t",
    "@": "a",
    "!": "i",
    "$": "s",
    "|": "i",
})

_KATA_TIDAK_PANTAS = {
    "anjing",
    "bangsat",
    "bajingan",
    "brengsek",
    "kontol",
    "memek",
    "jancok",
    "jancuk",
    "ngentot",
    "ngentod",
    "pepek",
    "lonte",
    "goblok",
    "tolol",
    "fuck",
    "fucker",
    "fuckers",
    "fucking",
    "fucked",
    "fck",
    "phuck",
    "shit",
    "shits",
    "shitty",
    "bullshit",
    "bitch",
    "bitches",
    "bastard",
    "bastards",
    "asshole",
    "assholes",
    "arsehole",
    "cunt",
    "cunts",
    "whore",
    "whores",
    "slut",
    "sluts",
    "pussy",
    "motherfucker",
    "retard",
    "retarded",
    "chink",
    "spic",
    "faggot",
    "tranny",
}
# Kata yang juga nama/marga sah di budaya lain (Fuk, Cock, Perek, Kike) sengaja tidak diblokir.


def _ringkas(kata: str) -> str:
    return re.sub(r"(.)\1+", r"\1", kata)


_KATA_RINGKAS = {_ringkas(k) for k in _KATA_TIDAK_PANTAS}


def _kata_terlarang(kata: str) -> bool:
    if _POLA_SLUR_N.fullmatch(kata):
        return True
    # Huruf berulang (fuuuck, anjiiing) dan v sebagai pengganti u (fvck) tidak menghindarkan filter.
    return _ringkas(kata) in _KATA_RINGKAS or _ringkas(kata.replace("v", "u")) in _KATA_RINGKAS


_POLA_SLUR_N = re.compile(r"^nig{2,}(?:er|a|ah|let|ers|as)?$")
_KATA_KASAR_ZH = ("操你妈", "草泥马", "傻逼", "王八蛋", "狗屎", "妈的", "他妈的", "婊子", "鸡巴")


def normalisasi_nama(nama: str) -> str:
    return " ".join(nama.split())


def _normalisasi_kata(kata: str) -> str:
    teks = unicodedata.normalize("NFKD", kata).casefold()
    teks = "".join(karakter for karakter in teks if not unicodedata.combining(karakter))
    teks = teks.translate(_PENGGANTI_LEET)
    # Tanda bintang berulang lazim dipakai untuk menyamarkan huruf di tengah kata.
    teks = re.sub(r"[*#]{2,}", "gg", teks)
    teks = re.sub(r"[^\w]", "", teks, flags=re.UNICODE)
    teks = re.sub(r"(.)\1{2,}", r"\1\1", teks)
    return re.sub(r"^\d+|\d+$", "", teks)


def nama_tidak_pantas(nama: str) -> bool:
    teks = unicodedata.normalize("NFKD", nama).casefold()
    teks = "".join(karakter for karakter in teks if not unicodedata.combining(karakter))
    teks = teks.translate(_PENGGANTI_LEET)
    if any(kata in teks for kata in _KATA_KASAR_ZH):
        return True

    bagian = re.findall(r"[^\s]+", teks)
    kata = [_normalisasi_kata(b) for b in bagian]
    if any(_kata_terlarang(w) for w in kata if w):
        return True

    # Tangkap kata kasar yang ditulis dengan spasi di antara setiap huruf.
    for awal in range(len(kata)):
        if not kata[awal] or len(kata[awal]) != 1:
            continue
        rangkaian = ""
        for bagian_kata in kata[awal:awal + 16]:
            if len(bagian_kata) != 1:
                break
            rangkaian += bagian_kata
            if _kata_terlarang(rangkaian):
                return True

    # Variasi sensor seperti f**k juga tidak boleh lolos.
    if re.search(r"(?<!\w)f[*#]{1,}k(?!\w)", teks):
        return True
    return False


def validasi_nama_pantas(nama: str) -> str:
    nama = normalisasi_nama(nama)
    if nama_tidak_pantas(nama):
        raise galat_validasi(
            "validasi_nama_tidak_pantas",
            "Nama mengandung kata yang tidak pantas. Gunakan nama yang sesuai.",
        )
    return nama
