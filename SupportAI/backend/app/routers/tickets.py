"""API обращений: /api/tickets, /api/customers"""
import sqlite3
from typing import Optional

from fastapi import APIRouter, Depends, Query, Response

from .. import schemas
from ..db import get_db
from ..services import tickets as service

router = APIRouter(prefix="/api", tags=["Обращения"])


@router.get("/tickets", response_model=schemas.TicketListOut, summary="Список обращений")
def list_tickets(
    status: Optional[schemas.Status] = None,
    priority: Optional[schemas.Priority] = None,
    q: Optional[str] = Query(default=None, max_length=100, description="Поиск по теме, клиенту, номеру"),
    sort: str = Query(default="updated", pattern="^(updated|newest|oldest|priority)$"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    db: sqlite3.Connection = Depends(get_db),
):
    return service.list_tickets(
        db, status=status, priority=priority, q=q, sort=sort, page=page, page_size=page_size
    )


@router.post(
    "/tickets", response_model=schemas.TicketDetail, status_code=201, summary="Создать обращение"
)
def create_ticket(payload: schemas.TicketCreate, db: sqlite3.Connection = Depends(get_db)):
    return service.create_ticket(db, payload.model_dump())


@router.get("/tickets/{ticket_id}", response_model=schemas.TicketDetail, summary="Одно обращение")
def get_ticket(ticket_id: int, db: sqlite3.Connection = Depends(get_db)):
    return service.get_ticket(db, ticket_id)


@router.patch(
    "/tickets/{ticket_id}", response_model=schemas.TicketDetail, summary="Изменить обращение"
)
def update_ticket(
    ticket_id: int, payload: schemas.TicketUpdate, db: sqlite3.Connection = Depends(get_db)
):
    return service.update_ticket(db, ticket_id, payload.model_dump(exclude_unset=True))


@router.delete("/tickets/{ticket_id}", status_code=204, summary="Удалить обращение")
def delete_ticket(ticket_id: int, db: sqlite3.Connection = Depends(get_db)):
    service.delete_ticket(db, ticket_id)
    return Response(status_code=204)


@router.post(
    "/tickets/{ticket_id}/messages",
    response_model=schemas.TicketDetail,
    status_code=201,
    summary="Добавить сообщение",
)
def add_message(
    ticket_id: int, payload: schemas.MessageCreate, db: sqlite3.Connection = Depends(get_db)
):
    return service.add_message(
        db, ticket_id, payload.text, payload.author, payload.author_name
    )


@router.get(
    "/customers", response_model=list[schemas.CustomerOut], summary="Список клиентов"
)
def list_customers(
    q: Optional[str] = Query(default=None, max_length=100),
    limit: int = Query(default=20, ge=1, le=100),
    db: sqlite3.Connection = Depends(get_db),
):
    return service.list_customers(db, q, limit)
