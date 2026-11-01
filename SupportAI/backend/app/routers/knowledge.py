"""API базы знаний: /api/knowledge"""
import sqlite3
from typing import Optional

from fastapi import APIRouter, Depends, Query, Response

from .. import schemas
from ..db import get_db
from ..services import knowledge as service

router = APIRouter(prefix="/api/knowledge", tags=["База знаний"])


@router.get("", response_model=list[schemas.KnowledgeOut], summary="Список статей, поиск")
def list_articles(
    q: Optional[str] = Query(default=None, max_length=100),
    category: Optional[str] = Query(default=None, max_length=60),
    db: sqlite3.Connection = Depends(get_db),
):
    return service.list_articles(db, q, category)


@router.get(
    "/categories", response_model=list[schemas.KnowledgeCategory], summary="Категории статей"
)
def list_categories(db: sqlite3.Connection = Depends(get_db)):
    return service.list_categories(db)


@router.get(
    "/suggest",
    response_model=list[schemas.KnowledgeSuggestion],
    summary="Подходящие статьи для текста обращения",
)
def suggest(
    text: str = Query(min_length=3, max_length=2000),
    limit: int = Query(default=3, ge=1, le=10),
    db: sqlite3.Connection = Depends(get_db),
):
    return service.suggest(db, text, limit)


@router.post("", response_model=schemas.KnowledgeOut, status_code=201, summary="Создать статью")
def create_article(payload: schemas.KnowledgeCreate, db: sqlite3.Connection = Depends(get_db)):
    return service.create_article(db, payload.model_dump())


@router.get("/{article_id}", response_model=schemas.KnowledgeOut, summary="Одна статья")
def get_article(article_id: int, db: sqlite3.Connection = Depends(get_db)):
    return service.get_article(db, article_id)


@router.patch("/{article_id}", response_model=schemas.KnowledgeOut, summary="Изменить статью")
def update_article(
    article_id: int, payload: schemas.KnowledgeUpdate, db: sqlite3.Connection = Depends(get_db)
):
    return service.update_article(db, article_id, payload.model_dump(exclude_unset=True))


@router.delete("/{article_id}", status_code=204, summary="Удалить статью")
def delete_article(article_id: int, db: sqlite3.Connection = Depends(get_db)):
    service.delete_article(db, article_id)
    return Response(status_code=204)
