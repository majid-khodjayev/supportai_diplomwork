"""Обращения клиентов: список, создание, изменение, сообщения."""
import sqlite3
from typing import Optional

from ..db import now_iso
from ..errors import BadRequestError, NotFoundError
from ..search import match_clauses
from . import settings as settings_service

PRIORITY_RANK = (
    "CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END"
)

# Допустимые варианты сортировки (значение подставляется в SQL только из этого словаря).
SORTS = {
    "updated": "t.updated_at DESC, t.id DESC",
    "newest": "t.created_at DESC, t.id DESC",
    "oldest": "t.created_at ASC, t.id ASC",
    "priority": f"{PRIORITY_RANK}, t.updated_at DESC, t.id DESC",
}

BASE_SELECT = """
SELECT t.*,
       c.name    AS c_name,
       c.email   AS c_email,
       c.company AS c_company,
       (SELECT COUNT(*) FROM messages m WHERE m.ticket_id = t.id) AS messages_count,
       (SELECT m.text   FROM messages m WHERE m.ticket_id = t.id ORDER BY m.id DESC LIMIT 1) AS last_message,
       (SELECT m.author FROM messages m WHERE m.ticket_id = t.id ORDER BY m.id DESC LIMIT 1) AS last_author
FROM tickets t
JOIN customers c ON c.id = t.customer_id
"""

UPDATABLE_FIELDS = {"subject", "status", "priority", "channel", "category", "assignee"}


def ticket_code(ticket_id: int) -> str:
    return f"SA-{1000 + ticket_id}"


def _row_to_ticket(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "code": ticket_code(row["id"]),
        "subject": row["subject"],
        "status": row["status"],
        "priority": row["priority"],
        "channel": row["channel"],
        "category": row["category"],
        "assignee": row["assignee"],
        "rating": row["rating"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
        "resolved_at": row["resolved_at"],
        "customer": {
            "id": row["customer_id"],
            "name": row["c_name"],
            "email": row["c_email"],
            "company": row["c_company"],
            "tickets_count": None,
        },
        "messages_count": row["messages_count"],
        "last_message": row["last_message"],
        "last_author": row["last_author"],
    }


def _filters(priority: Optional[str], q: Optional[str]):
    where, params = [], []
    if priority:
        where.append("t.priority = ?")
        params.append(priority)
    clauses, clause_params = match_clauses(
        [
            "t.subject",
            "t.category",
            "c.name",
            "c.email",
            "COALESCE(c.company, '')",
            "'SA-' || (1000 + t.id)",
        ],
        q or "",
    )
    where.extend(clauses)
    params.extend(clause_params)
    return where, params


def list_tickets(
    db: sqlite3.Connection,
    *,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    q: Optional[str] = None,
    sort: str = "updated",
    page: int = 1,
    page_size: int = 10,
) -> dict:
    where, params = _filters(priority, q)
    base_where = f" WHERE {' AND '.join(where)}" if where else ""

    # Счётчики для вкладок считаются без фильтра по статусу.
    counts = {"all": 0, "new": 0, "open": 0, "pending": 0, "resolved": 0}
    count_rows = db.execute(
        "SELECT t.status AS status, COUNT(*) AS n FROM tickets t "
        f"JOIN customers c ON c.id = t.customer_id{base_where} GROUP BY t.status",
        params,
    ).fetchall()
    for row in count_rows:
        counts[row["status"]] = row["n"]
        counts["all"] += row["n"]

    list_where, list_params = list(where), list(params)
    if status:
        list_where.append("t.status = ?")
        list_params.append(status)
    list_where_sql = f" WHERE {' AND '.join(list_where)}" if list_where else ""

    total = db.execute(
        f"SELECT COUNT(*) FROM tickets t JOIN customers c ON c.id = t.customer_id{list_where_sql}",
        list_params,
    ).fetchone()[0]

    order = SORTS.get(sort, SORTS["updated"])
    rows = db.execute(
        f"{BASE_SELECT}{list_where_sql} ORDER BY {order} LIMIT ? OFFSET ?",
        [*list_params, page_size, (page - 1) * page_size],
    ).fetchall()

    return {
        "items": [_row_to_ticket(r) for r in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": max(1, -(-total // page_size)),
        "counts": counts,
    }


def get_ticket(db: sqlite3.Connection, ticket_id: int) -> dict:
    row = db.execute(f"{BASE_SELECT} WHERE t.id = ?", (ticket_id,)).fetchone()
    if row is None:
        raise NotFoundError("Обращение не найдено")
    ticket = _row_to_ticket(row)
    ticket["customer"]["tickets_count"] = db.execute(
        "SELECT COUNT(*) FROM tickets WHERE customer_id = ?", (row["customer_id"],)
    ).fetchone()[0]
    ticket["messages"] = [
        dict(m)
        for m in db.execute(
            "SELECT id, ticket_id, author, author_name, text, created_at "
            "FROM messages WHERE ticket_id = ? ORDER BY id",
            (ticket_id,),
        )
    ]
    return ticket


def create_ticket(db: sqlite3.Connection, data: dict) -> dict:
    now = now_iso()
    email = data["customer_email"].lower()
    try:
        customer = db.execute(
            "SELECT id, name FROM customers WHERE email = ?", (email,)
        ).fetchone()
        if customer:
            customer_id, customer_name = customer["id"], customer["name"]
        else:
            cur = db.execute(
                "INSERT INTO customers (name, email, company, created_at) VALUES (?, ?, ?, ?)",
                (data["customer_name"], email, data.get("customer_company"), now),
            )
            customer_id, customer_name = cur.lastrowid, data["customer_name"]

        cur = db.execute(
            "INSERT INTO tickets (subject, customer_id, status, priority, channel, category, "
            "created_at, updated_at) VALUES (?, ?, 'new', ?, ?, ?, ?, ?)",
            (
                data["subject"],
                customer_id,
                data["priority"],
                data["channel"],
                data["category"],
                now,
                now,
            ),
        )
        ticket_id = cur.lastrowid
        db.execute(
            "INSERT INTO messages (ticket_id, author, author_name, text, created_at) "
            "VALUES (?, 'customer', ?, ?, ?)",
            (ticket_id, customer_name, data["message"], now),
        )
        db.commit()
    except Exception:
        db.rollback()
        raise
    return get_ticket(db, ticket_id)


def update_ticket(db: sqlite3.Connection, ticket_id: int, changes: dict) -> dict:
    fields = {
        key: value
        for key, value in changes.items()
        if key in UPDATABLE_FIELDS and (value is not None or key == "assignee")
    }
    if not fields:
        raise BadRequestError("Нет данных для обновления")

    row = db.execute("SELECT status FROM tickets WHERE id = ?", (ticket_id,)).fetchone()
    if row is None:
        raise NotFoundError("Обращение не найдено")

    if "assignee" in fields and not fields["assignee"]:
        fields["assignee"] = None

    now = now_iso()
    sets = [f"{key} = ?" for key in fields]  # ключи — только из белого списка выше
    params = list(fields.values())

    if "status" in fields:
        if fields["status"] == "resolved" and row["status"] != "resolved":
            sets.append("resolved_at = ?")
            params.append(now)
        elif fields["status"] != "resolved":
            sets.append("resolved_at = NULL")

    sets.append("updated_at = ?")
    params.extend([now, ticket_id])

    db.execute(f"UPDATE tickets SET {', '.join(sets)} WHERE id = ?", params)
    db.commit()
    return get_ticket(db, ticket_id)


def delete_ticket(db: sqlite3.Connection, ticket_id: int) -> None:
    cur = db.execute("DELETE FROM tickets WHERE id = ?", (ticket_id,))
    db.commit()
    if cur.rowcount == 0:
        raise NotFoundError("Обращение не найдено")


def add_message(
    db: sqlite3.Connection,
    ticket_id: int,
    text: str,
    author: str = "agent",
    author_name: Optional[str] = None,
) -> dict:
    row = db.execute(
        "SELECT t.status, c.name AS customer_name FROM tickets t "
        "JOIN customers c ON c.id = t.customer_id WHERE t.id = ?",
        (ticket_id,),
    ).fetchone()
    if row is None:
        raise NotFoundError("Обращение не найдено")

    if author == "customer":
        name = row["customer_name"]
    else:
        name = author_name or settings_service.get_all(db)["operator_name"]

    now = now_iso()
    new_status = row["status"]
    if author == "agent" and row["status"] == "new":
        new_status = "open"
    elif author == "customer" and row["status"] in ("pending", "resolved"):
        new_status = "open"

    try:
        db.execute(
            "INSERT INTO messages (ticket_id, author, author_name, text, created_at) "
            "VALUES (?, ?, ?, ?, ?)",
            (ticket_id, author, name, text, now),
        )
        db.execute(
            "UPDATE tickets SET status = ?, updated_at = ?, "
            "resolved_at = CASE WHEN ? = 'resolved' THEN resolved_at ELSE NULL END WHERE id = ?",
            (new_status, now, new_status, ticket_id),
        )
        db.commit()
    except Exception:
        db.rollback()
        raise
    return get_ticket(db, ticket_id)


def list_customers(db: sqlite3.Connection, q: Optional[str] = None, limit: int = 20) -> list:
    clauses, params = match_clauses(["c.name", "c.email", "COALESCE(c.company, '')"], q or "")
    where = f" WHERE {' AND '.join(clauses)}" if clauses else ""
    rows = db.execute(
        "SELECT c.id, c.name, c.email, c.company, COUNT(t.id) AS tickets_count "
        "FROM customers c LEFT JOIN tickets t ON t.customer_id = c.id"
        f"{where} GROUP BY c.id ORDER BY c.name LIMIT ?",
        [*params, limit],
    ).fetchall()
    return [dict(r) for r in rows]
