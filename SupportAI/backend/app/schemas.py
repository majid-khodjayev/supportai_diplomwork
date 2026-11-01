"""Схемы данных (Pydantic): проверка входящих данных и форма ответов API.

Тексты ошибок на русском — они показываются пользователю в интерфейсе.
"""
import re
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

Status = Literal["new", "open", "pending", "resolved"]
Priority = Literal["low", "medium", "high", "urgent"]
Channel = Literal["email", "chat", "phone", "telegram"]
Author = Literal["customer", "agent"]
PlanId = Literal["starter", "business", "enterprise"]
BillingPeriod = Literal["monthly", "yearly"]

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


class InputModel(BaseModel):
    """Базовая модель для входящих данных: обрезает пробелы по краям строк."""

    model_config = ConfigDict(str_strip_whitespace=True)


def _validate_email(value: str) -> str:
    if not EMAIL_RE.match(value):
        raise ValueError("Введите корректный email, например name@company.com")
    return value.lower()


def _empty_to_none(value):
    if isinstance(value, str) and not value.strip():
        return None
    return value


# --------------------------------------------------------------------------
# Входящие данные
# --------------------------------------------------------------------------
class TicketCreate(InputModel):
    subject: str = Field(min_length=3, max_length=200)
    customer_name: str = Field(min_length=2, max_length=100)
    customer_email: str = Field(max_length=200)
    customer_company: Optional[str] = Field(default=None, max_length=120)
    priority: Priority = "medium"
    channel: Channel = "email"
    category: str = Field(default="Общее", min_length=2, max_length=60)
    message: str = Field(min_length=3, max_length=5000)

    _email = field_validator("customer_email")(_validate_email)
    _company = field_validator("customer_company", mode="before")(_empty_to_none)


class TicketUpdate(InputModel):
    subject: Optional[str] = Field(default=None, min_length=3, max_length=200)
    status: Optional[Status] = None
    priority: Optional[Priority] = None
    channel: Optional[Channel] = None
    category: Optional[str] = Field(default=None, min_length=2, max_length=60)
    assignee: Optional[str] = Field(default=None, max_length=100)


class MessageCreate(InputModel):
    text: str = Field(min_length=1, max_length=5000)
    author: Author = "agent"
    author_name: Optional[str] = Field(default=None, max_length=100)

    _author_name = field_validator("author_name", mode="before")(_empty_to_none)


class KnowledgeCreate(InputModel):
    question: str = Field(min_length=5, max_length=300)
    answer: str = Field(min_length=5, max_length=5000)
    category: str = Field(default="Общее", min_length=2, max_length=60)


class KnowledgeUpdate(InputModel):
    question: Optional[str] = Field(default=None, min_length=5, max_length=300)
    answer: Optional[str] = Field(default=None, min_length=5, max_length=5000)
    category: Optional[str] = Field(default=None, min_length=2, max_length=60)


class SettingsUpdate(InputModel):
    company_name: Optional[str] = Field(default=None, min_length=2, max_length=100)
    operator_name: Optional[str] = Field(default=None, min_length=2, max_length=100)
    support_email: Optional[str] = Field(default=None, max_length=200)
    timezone: Optional[str] = Field(default=None, min_length=3, max_length=60)
    work_start: Optional[str] = None
    work_end: Optional[str] = None
    default_priority: Optional[Priority] = None
    signature: Optional[str] = Field(default=None, max_length=500)
    notify_new_ticket: Optional[bool] = None
    notify_urgent: Optional[bool] = None
    notify_daily_digest: Optional[bool] = None

    @field_validator("support_email")
    @classmethod
    def _support_email(cls, value):
        return _validate_email(value) if value is not None else value

    @field_validator("work_start", "work_end")
    @classmethod
    def _time(cls, value):
        if value is not None and not TIME_RE.match(value):
            raise ValueError("Укажите время в формате ЧЧ:ММ, например 09:00")
        return value


class PlanSelect(InputModel):
    plan: PlanId
    billing_period: BillingPeriod = "monthly"


# --------------------------------------------------------------------------
# Ответы API
# --------------------------------------------------------------------------
class TicketCustomer(BaseModel):
    id: int
    name: str
    email: str
    company: Optional[str] = None
    tickets_count: Optional[int] = None


class MessageOut(BaseModel):
    id: int
    ticket_id: int
    author: Author
    author_name: str
    text: str
    created_at: str


class TicketOut(BaseModel):
    id: int
    code: str
    subject: str
    status: Status
    priority: Priority
    channel: Channel
    category: str
    assignee: Optional[str] = None
    rating: Optional[int] = None
    created_at: str
    updated_at: str
    resolved_at: Optional[str] = None
    customer: TicketCustomer
    messages_count: int = 0
    last_message: Optional[str] = None
    last_author: Optional[Author] = None


class TicketDetail(TicketOut):
    messages: List[MessageOut] = []


class TicketCounts(BaseModel):
    all: int = 0
    new: int = 0
    open: int = 0
    pending: int = 0
    resolved: int = 0


class TicketListOut(BaseModel):
    items: List[TicketOut]
    total: int
    page: int
    page_size: int
    pages: int
    counts: TicketCounts


class CustomerOut(BaseModel):
    id: int
    name: str
    email: str
    company: Optional[str] = None
    tickets_count: int = 0


class KnowledgeOut(BaseModel):
    id: int
    question: str
    answer: str
    category: str
    created_at: str
    updated_at: str


class KnowledgeSuggestion(KnowledgeOut):
    score: int = 0


class KnowledgeCategory(BaseModel):
    name: str
    count: int


class SettingsOut(BaseModel):
    company_name: str
    operator_name: str
    support_email: str
    timezone: str
    work_start: str
    work_end: str
    default_priority: Priority
    signature: str
    notify_new_ticket: bool
    notify_urgent: bool
    notify_daily_digest: bool
    plan: PlanId
    billing_period: BillingPeriod


class Plan(BaseModel):
    id: PlanId
    name: str
    tagline: str
    price_monthly: int
    price_yearly: int
    ticket_limit: Optional[int] = None
    seats: Optional[int] = None
    popular: bool = False
    features: List[str]


class PlansOut(BaseModel):
    plans: List[Plan]
    current_plan: PlanId
    billing_period: BillingPeriod
    tickets_used_30d: int


class Trend(BaseModel):
    current: int
    previous: int
    change_pct: Optional[float] = None


class CountItem(BaseModel):
    key: str
    count: int


class SeriesPoint(BaseModel):
    date: str
    created: int
    resolved: int
    backlog: int


class StatsTotals(BaseModel):
    total: int
    active: int
    resolved: int
    new: int
    urgent_active: int
    resolution_rate: float


class StatsOverview(BaseModel):
    totals: StatsTotals
    avg_resolution_hours: Optional[float] = None
    csat: Optional[float] = None
    csat_count: int = 0
    trends: dict
    series: List[SeriesPoint]
    by_status: List[CountItem]
    by_priority_active: List[CountItem]
    by_channel: List[CountItem]
    by_category: List[CountItem]
