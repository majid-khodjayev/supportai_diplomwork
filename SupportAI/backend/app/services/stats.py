"""Статистика для дашборда. Всё считается по реальным данным в базе."""
import sqlite3
from collections import Counter
from datetime import datetime, time, timedelta, timezone
from typing import Optional

from ..db import parse_iso

STATUS_ORDER = ["new", "open", "pending", "resolved"]
PRIORITY_ORDER = ["urgent", "high", "medium", "low"]


def _trend(current: int, previous: int) -> dict:
    change = round((current - previous) / previous * 100, 1) if previous else None
    return {"current": current, "previous": previous, "change_pct": change}


def _counted(counter: Counter, order: Optional[list] = None, limit: Optional[int] = None) -> list:
    if order is not None:
        return [{"key": key, "count": counter.get(key, 0)} for key in order]
    items = sorted(counter.items(), key=lambda kv: (-kv[1], kv[0]))
    if limit:
        items = items[:limit]
    return [{"key": key, "count": count} for key, count in items]


def overview(db: sqlite3.Connection, days: int = 14) -> dict:
    now = datetime.now(timezone.utc)

    tickets = []
    for row in db.execute(
        "SELECT status, priority, channel, category, rating, created_at, resolved_at FROM tickets"
    ):
        tickets.append(
            {
                "status": row["status"],
                "priority": row["priority"],
                "channel": row["channel"],
                "category": row["category"],
                "rating": row["rating"],
                "created": parse_iso(row["created_at"]),
                "resolved": parse_iso(row["resolved_at"]) if row["resolved_at"] else None,
            }
        )

    def backlog_at(moment: datetime) -> int:
        return sum(
            1
            for t in tickets
            if t["created"] <= moment and (t["resolved"] is None or t["resolved"] > moment)
        )

    # --- итоги ---
    total = len(tickets)
    active = [t for t in tickets if t["status"] != "resolved"]
    resolved_count = total - len(active)
    totals = {
        "total": total,
        "active": len(active),
        "resolved": resolved_count,
        "new": sum(1 for t in tickets if t["status"] == "new"),
        "urgent_active": sum(1 for t in active if t["priority"] == "urgent"),
        "resolution_rate": round(resolved_count / total * 100, 1) if total else 0.0,
    }

    # --- среднее время решения и оценка клиентов ---
    durations = [
        (t["resolved"] - t["created"]).total_seconds() / 3600
        for t in tickets
        if t["resolved"] is not None and t["status"] == "resolved"
    ]
    ratings = [t["rating"] for t in tickets if t["rating"]]

    # --- динамика за последние 7 дней против предыдущих 7 ---
    week_ago, two_weeks_ago = now - timedelta(days=7), now - timedelta(days=14)
    created_now = sum(1 for t in tickets if t["created"] > week_ago)
    created_prev = sum(1 for t in tickets if two_weeks_ago < t["created"] <= week_ago)
    resolved_now = sum(1 for t in tickets if t["resolved"] and t["resolved"] > week_ago)
    resolved_prev = sum(
        1 for t in tickets if t["resolved"] and two_weeks_ago < t["resolved"] <= week_ago
    )
    trends = {
        "created": _trend(created_now, created_prev),
        "resolved": _trend(resolved_now, resolved_prev),
        "active": _trend(backlog_at(now), backlog_at(week_ago)),
    }

    # --- ряд по дням ---
    series = []
    today = now.date()
    for offset in range(days - 1, -1, -1):
        day = today - timedelta(days=offset)
        start = datetime.combine(day, time.min, tzinfo=timezone.utc)
        end = start + timedelta(days=1)
        series.append(
            {
                "date": day.isoformat(),
                "created": sum(1 for t in tickets if start <= t["created"] < end),
                "resolved": sum(1 for t in tickets if t["resolved"] and start <= t["resolved"] < end),
                "backlog": backlog_at(min(end, now)),
            }
        )

    return {
        "totals": totals,
        "avg_resolution_hours": round(sum(durations) / len(durations), 1) if durations else None,
        "csat": round(sum(ratings) / len(ratings), 2) if ratings else None,
        "csat_count": len(ratings),
        "trends": trends,
        "series": series,
        "by_status": _counted(Counter(t["status"] for t in tickets), STATUS_ORDER),
        "by_priority_active": _counted(Counter(t["priority"] for t in active), PRIORITY_ORDER),
        "by_channel": _counted(Counter(t["channel"] for t in tickets)),
        "by_category": _counted(Counter(t["category"] for t in tickets), limit=6),
    }


def tickets_created_since(db: sqlite3.Connection, days: int) -> int:
    since = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%SZ")
    return db.execute("SELECT COUNT(*) FROM tickets WHERE created_at >= ?", (since,)).fetchone()[0]
