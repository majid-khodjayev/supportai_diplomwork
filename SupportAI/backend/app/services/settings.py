"""Настройки компании. Хранятся в таблице settings как пары «ключ — значение (JSON)»."""
import json
import sqlite3

from ..errors import BadRequestError

DEFAULT_SETTINGS = {
    "company_name": "Lumen",
    "operator_name": "Оператор поддержки",
    "support_email": "support@lumen.example",
    "timezone": "Asia/Tashkent",
    "work_start": "09:00",
    "work_end": "18:00",
    "default_priority": "medium",
    "signature": "С уважением,\nкоманда поддержки Lumen",
    "notify_new_ticket": True,
    "notify_urgent": True,
    "notify_daily_digest": False,
    "plan": "business",
    "billing_period": "monthly",
}

SEEDED_KEY = "_seeded"


def get_all(db: sqlite3.Connection) -> dict:
    result = dict(DEFAULT_SETTINGS)
    for row in db.execute("SELECT key, value FROM settings"):
        if row["key"] in DEFAULT_SETTINGS:
            result[row["key"]] = json.loads(row["value"])
    return result


def update(db: sqlite3.Connection, changes: dict) -> dict:
    changes = {k: v for k, v in changes.items() if k in DEFAULT_SETTINGS and v is not None}
    if not changes:
        raise BadRequestError("Нет данных для обновления")

    merged = {**get_all(db), **changes}
    if merged["work_start"] >= merged["work_end"]:
        raise BadRequestError("Время окончания работы должно быть позже времени начала")

    for key, value in changes.items():
        db.execute(
            "INSERT INTO settings (key, value) VALUES (?, ?) "
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (key, json.dumps(value, ensure_ascii=False)),
        )
    db.commit()
    return get_all(db)


def is_seeded(db: sqlite3.Connection) -> bool:
    row = db.execute("SELECT 1 FROM settings WHERE key = ?", (SEEDED_KEY,)).fetchone()
    return row is not None


def mark_seeded(db: sqlite3.Connection) -> None:
    db.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (SEEDED_KEY, "true")
    )
    db.commit()
