"""Статистика, настройки, тарифы и служебные адреса."""
import sqlite3

from fastapi import APIRouter, Depends, Query

from .. import schemas
from ..db import get_db
from ..seed import reset_demo_data
from ..services import plans as plans_service
from ..services import settings as settings_service
from ..services import stats as stats_service

router = APIRouter(prefix="/api", tags=["Система"])


@router.get("/health", summary="Проверка работы сервера")
def health(db: sqlite3.Connection = Depends(get_db)):
    db.execute("SELECT 1")
    return {"status": "ok"}


@router.get("/stats/overview", response_model=schemas.StatsOverview, summary="Статистика дашборда")
def stats_overview(
    days: int = Query(default=14, ge=7, le=90), db: sqlite3.Connection = Depends(get_db)
):
    return stats_service.overview(db, days)


@router.get("/settings", response_model=schemas.SettingsOut, summary="Настройки")
def get_settings(db: sqlite3.Connection = Depends(get_db)):
    return settings_service.get_all(db)


@router.patch("/settings", response_model=schemas.SettingsOut, summary="Сохранить настройки")
def update_settings(payload: schemas.SettingsUpdate, db: sqlite3.Connection = Depends(get_db)):
    return settings_service.update(db, payload.model_dump(exclude_unset=True))


@router.post("/settings/reset-demo", summary="Вернуть демо-данные")
def reset_demo(db: sqlite3.Connection = Depends(get_db)):
    reset_demo_data(db)
    return {"status": "ok"}


@router.get("/plans", response_model=schemas.PlansOut, summary="Тарифы")
def get_plans(db: sqlite3.Connection = Depends(get_db)):
    return plans_service.get_plans(db)


@router.post("/plans/select", response_model=schemas.PlansOut, summary="Выбрать тариф")
def select_plan(payload: schemas.PlanSelect, db: sqlite3.Connection = Depends(get_db)):
    return plans_service.select_plan(db, payload.plan, payload.billing_period)
