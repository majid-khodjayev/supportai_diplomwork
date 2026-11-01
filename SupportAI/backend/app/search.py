"""Простой поиск по тексту, общий для обращений и базы знаний.

Запрос делится на слова; каждое слово должно встретиться хотя бы в одном из полей.
Регистр не важен (в том числе для кириллицы). Из длинных слов отбрасывается последняя буква,
чтобы «пароль» находил «пароля», а «тариф» — «тарифы».
"""
import re
from typing import Iterable, List, Tuple


def search_terms(query: str) -> List[str]:
    terms = []
    for token in re.findall(r"[\w-]+", (query or "").lower()):
        token = token.strip("-")
        if not token:
            continue
        # Обрезаем окончание только у обычных слов (не у кодов вроде SA-1001).
        if token.isalpha() and len(token) >= 5:
            token = token[:-1]
        terms.append(token)
    return terms


def match_clauses(expressions: Iterable[str], query: str) -> Tuple[List[str], list]:
    """Возвращает (условия SQL, параметры) для WHERE. Выражения задаются в коде, не пользователем."""
    expressions = list(expressions)
    clauses, params = [], []
    for term in search_terms(query):
        parts = [f"instr(pylower({expr}), ?) > 0" for expr in expressions]
        clauses.append("(" + " OR ".join(parts) + ")")
        params.extend([term] * len(expressions))
    return clauses, params
