"""Работа с базой данных SQLite (стандартный модуль sqlite3, без ORM).

Все таблицы описаны ниже в SCHEMA. Если нужно добавить поле — добавьте его
в SCHEMA и, для уже созданной базы, удалите файл backend/data/supportai.db
(демо-данные создадутся заново) или выполните ALTER TABLE вручную.
"""
import sqlite3
from datetime import datetime, timezone
from typing import Iterator

from .config import DB_PATH, SEED_DEMO_DATA

ISO_FORMAT = "%Y-%m-%dT%H:%M:%SZ"

SCHEMA = """
CREATE TABLE IF NOT EXISTS customers (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    email      TEXT NOT NULL UNIQUE,
    company    TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tickets (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    subject     TEXT NOT NULL,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    status      TEXT NOT NULL DEFAULT 'new'
                CHECK (status IN ('new', 'open', 'pending', 'resolved')),
    priority    TEXT NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    channel     TEXT NOT NULL DEFAULT 'email'
                CHECK (channel IN ('email', 'chat', 'phone', 'telegram')),
    category    TEXT NOT NULL DEFAULT 'Общее',
    assignee    TEXT,
    rating      INTEGER CHECK (rating BETWEEN 1 AND 5),
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    resolved_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_tickets_status   ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_customer ON tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created  ON tickets(created_at);

CREATE TABLE IF NOT EXISTS messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id   INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    author      TEXT NOT NULL CHECK (author IN ('customer', 'agent')),
    author_name TEXT NOT NULL,
    text        TEXT NOT NULL,
    created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_ticket ON messages(ticket_id);

CREATE TABLE IF NOT EXISTS knowledge (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    question   TEXT NOT NULL,
    answer     TEXT NOT NULL,
    category   TEXT NOT NULL DEFAULT 'Общее',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
"""


def now_iso() -> str:
    """Текущее время в UTC в формате 2026-10-30T12:00:00Z."""
    return datetime.now(timezone.utc).strftime(ISO_FORMAT)


def to_iso(moment: datetime) -> str:
    return moment.astimezone(timezone.utc).strftime(ISO_FORMAT)


def parse_iso(value: str) -> datetime:
    return datetime.strptime(value, ISO_FORMAT).replace(tzinfo=timezone.utc)


def _pylower(value):
    """lower() в SQLite понимает только латиницу — эта функция понимает и кириллицу."""
    return value.lower() if isinstance(value, str) else value


def connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False, timeout=15)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.create_function("pylower", 1, _pylower, deterministic=True)
    return conn


def get_db() -> Iterator[sqlite3.Connection]:
    """Зависимость FastAPI: отдельное соединение на каждый запрос.

    Изменения сохраняются явным db.commit() в сервисах (папка services).
    """
    conn = connect()
    try:
        yield conn
    finally:
        conn.close()


def init_db() -> None:
    """Создаёт таблицы и, при первом запуске, добавляет демо-данные."""
    from .seed import seed_demo_data  # импорт здесь, чтобы не было циклических импортов
    from .services import settings as settings_service

    conn = connect()
    try:
        conn.executescript(SCHEMA)
        conn.commit()
        if SEED_DEMO_DATA and not settings_service.is_seeded(conn):
            seed_demo_data(conn)
    finally:
        conn.close()
