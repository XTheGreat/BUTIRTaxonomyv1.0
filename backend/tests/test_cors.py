import asyncio
import os
import tempfile

_DB_FILE = os.path.join(tempfile.mkdtemp(), "uji_cors.db")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_DB_FILE}"
os.environ["FRONTEND_URL"] = "https://baru.vercel.app, https://lama.vercel.app/"

import httpx

from app.config import get_settings
from app.main import app


async def _preflight(c, origin):
    return await c.options(
        "/api/auth/metode",
        headers={"Origin": origin, "Access-Control-Request-Method": "GET"},
    )


async def _jalankan():
    assert get_settings().frontend_urls == ["https://baru.vercel.app", "https://lama.vercel.app"]
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://uji") as c:
        for asal in ("https://baru.vercel.app", "https://lama.vercel.app", "http://localhost:3000"):
            r = await _preflight(c, asal)
            assert r.status_code == 200 and r.headers.get("access-control-allow-origin") == asal, (asal, r.headers)
        r = await _preflight(c, "https://jahat.example.com")
        assert "access-control-allow-origin" not in r.headers, "asal asing tidak boleh diizinkan"


def test_cors():
    asyncio.run(_jalankan())


if __name__ == "__main__":
    asyncio.run(_jalankan())
    print("Semua tes CORS lulus.")
