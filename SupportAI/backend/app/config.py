"""Настройки приложения.

Значения читаются из файла .env в корне проекта (см. .env.example).
Если файла нет — используются значения по умолчанию, проект всё равно запустится.
"""
import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent  # папка backend/
ROOT_DIR = BACKEND_DIR.parent                          # корень проекта

load_dotenv(ROOT_DIR / ".env")


def _env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on", "да"}


def _resolve_path(value: str) -> Path:
    path = Path(value)
    return path if path.is_absolute() else (ROOT_DIR / path).resolve()


# Файл базы данных SQLite. Папка создаётся автоматически.
DB_PATH = _resolve_path(os.getenv("SUPPORTAI_DB_PATH", "backend/data/supportai.db"))

# Адреса фронтенда, которым разрешён доступ к API.
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if origin.strip()
]

# Заполнять ли пустую базу демонстрационными данными при первом запуске.
SEED_DEMO_DATA = _env_bool("SEED_DEMO_DATA", True)

# Готовая сборка фронтенда (npm run build). Если папка есть — backend отдаёт её сам.
FRONTEND_DIST = ROOT_DIR / "frontend" / "dist"
