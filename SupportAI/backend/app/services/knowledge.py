"""База знаний: вопросы и ответы, поиск и простые подсказки по тексту обращения."""
import re
import sqlite3
from typing import Optional

from ..db import now_iso
from ..errors import BadRequestError, NotFoundError
from ..search import match_clauses

UPDATABLE_FIELDS = {"question", "answer", "category"}

# Слова, которые не помогают искать подходящую статью.
STOP_WORDS = {
    "здравствуйте", "добрый", "добрыи", "спасибо", "пожалуйста", "когда", "почему",
    "который", "которые", "можно", "нужно", "очень", "этого", "этот", "если", "чтобы",
    "меня", "нас", "вас", "наш", "ваш", "уже", "тоже", "просто", "быть",
}


def _tokens(text: str) -> list:
    return [t for t in re.findall(r"\w+", text.lower()) if len(t) >= 3]


def list_articles(
    db: sqlite3.Connection, q: Optional[str] = None, category: Optional[str] = None
) -> list:
    where, params = [], []
    if category:
        where.append("category = ?")
        params.append(category)
    clauses, clause_params = match_clauses(["question", "answer", "category"], q or "")
    where.extend(clauses)
    params.extend(clause_params)
    where_sql = f" WHERE {' AND '.join(where)}" if where else ""
    rows = db.execute(
        f"SELECT id, question, answer, category, created_at, updated_at FROM knowledge"
        f"{where_sql} ORDER BY category, question",
        params,
    ).fetchall()
    return [dict(r) for r in rows]


def list_categories(db: sqlite3.Connection) -> list:
    rows = db.execute(
        "SELECT category AS name, COUNT(*) AS count FROM knowledge "
        "GROUP BY category ORDER BY count DESC, category"
    ).fetchall()
    return [dict(r) for r in rows]


def get_article(db: sqlite3.Connection, article_id: int) -> dict:
    row = db.execute(
        "SELECT id, question, answer, category, created_at, updated_at "
        "FROM knowledge WHERE id = ?",
        (article_id,),
    ).fetchone()
    if row is None:
        raise NotFoundError("Статья не найдена")
    return dict(row)


def create_article(db: sqlite3.Connection, data: dict) -> dict:
    now = now_iso()
    cur = db.execute(
        "INSERT INTO knowledge (question, answer, category, created_at, updated_at) "
        "VALUES (?, ?, ?, ?, ?)",
        (data["question"], data["answer"], data["category"], now, now),
    )
    db.commit()
    return get_article(db, cur.lastrowid)


def update_article(db: sqlite3.Connection, article_id: int, changes: dict) -> dict:
    fields = {k: v for k, v in changes.items() if k in UPDATABLE_FIELDS and v is not None}
    if not fields:
        raise BadRequestError("Нет данных для обновления")
    get_article(db, article_id)  # 404, если статьи нет

    sets = [f"{key} = ?" for key in fields]  # ключи — только из белого списка выше
    sets.append("updated_at = ?")
    params = [*fields.values(), now_iso(), article_id]
    db.execute(f"UPDATE knowledge SET {', '.join(sets)} WHERE id = ?", params)
    db.commit()
    return get_article(db, article_id)


def delete_article(db: sqlite3.Connection, article_id: int) -> None:
    cur = db.execute("DELETE FROM knowledge WHERE id = ?", (article_id,))
    db.commit()
    if cur.rowcount == 0:
        raise NotFoundError("Статья не найдена")


def suggest(db: sqlite3.Connection, text: str, limit: int = 3) -> list:
    """Подбирает статьи по совпадению слов (без AI): основа для будущих умных подсказок.

    Слова сравниваются по первым 5 буквам, чтобы «пароль» находил «пароля» и «паролем».
    """
    stems = {
        token[:5]
        for token in _tokens(text)
        if len(token) >= 4 and token not in STOP_WORDS
    }
    if not stems:
        return []

    scored = []
    for article in list_articles(db):
        question = article["question"].lower()
        answer = article["answer"].lower()
        score = sum(2 for s in stems if s in question) + sum(1 for s in stems if s in answer)
        if score > 0:
            scored.append({**article, "score": score})
    scored.sort(key=lambda a: (-a["score"], a["question"]))
    return scored[:limit]
