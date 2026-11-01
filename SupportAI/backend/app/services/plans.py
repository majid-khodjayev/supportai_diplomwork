"""Тарифные планы. Чтобы изменить цены или описание — правьте список PLANS ниже."""
import sqlite3

from . import settings as settings_service
from .stats import tickets_created_since

PLANS = [
    {
        "id": "starter",
        "name": "Старт",
        "tagline": "Для небольших команд, которые только начинают",
        "price_monthly": 0,
        "price_yearly": 0,
        "ticket_limit": 100,
        "seats": 3,
        "popular": False,
        "features": [
            "До 100 обращений в месяц",
            "3 оператора",
            "База знаний до 30 статей",
            "Почта и чат на сайте",
            "Базовая аналитика",
        ],
    },
    {
        "id": "business",
        "name": "Бизнес",
        "tagline": "Для растущих команд с постоянным потоком обращений",
        "price_monthly": 49,
        "price_yearly": 39,
        "ticket_limit": 2000,
        "seats": 15,
        "popular": True,
        "features": [
            "До 2 000 обращений в месяц",
            "15 операторов",
            "Безлимитная база знаний",
            "Telegram, почта, чат и телефон",
            "Расширенная аналитика и отчёты",
            "AI-помощник для ответов",
        ],
    },
    {
        "id": "enterprise",
        "name": "Корпоративный",
        "tagline": "Для больших отделов поддержки и сложных процессов",
        "price_monthly": 149,
        "price_yearly": 119,
        "ticket_limit": None,
        "seats": None,
        "popular": False,
        "features": [
            "Без ограничений по обращениям",
            "Без ограничений по операторам",
            "Все каналы и интеграции через API",
            "Роли, права доступа и журнал действий",
            "Персональный менеджер",
            "AI-помощник с настройкой под компанию",
        ],
    },
]


def get_plans(db: sqlite3.Connection) -> dict:
    current = settings_service.get_all(db)
    return {
        "plans": PLANS,
        "current_plan": current["plan"],
        "billing_period": current["billing_period"],
        "tickets_used_30d": tickets_created_since(db, 30),
    }


def select_plan(db: sqlite3.Connection, plan: str, billing_period: str) -> dict:
    settings_service.update(db, {"plan": plan, "billing_period": billing_period})
    return get_plans(db)
