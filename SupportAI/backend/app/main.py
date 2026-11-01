"""Точка входа backend. Запуск: uvicorn app.main:app --reload (из папки backend)."""
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from .config import CORS_ORIGINS, FRONTEND_DIST
from .db import init_db
from .errors import AppError
from .routers import knowledge, system, tickets


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()  # создаёт таблицы и демо-данные при первом запуске
    yield


app = FastAPI(
    title="SupportAI API",
    description="Backend платформы интеллектуальной поддержки клиентов.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

FIELD_NAMES = {
    "subject": "Тема",
    "customer_name": "Имя клиента",
    "customer_email": "Email клиента",
    "customer_company": "Компания",
    "message": "Сообщение",
    "text": "Текст сообщения",
    "question": "Вопрос",
    "answer": "Ответ",
    "category": "Категория",
    "company_name": "Название компании",
    "operator_name": "Имя оператора",
    "support_email": "Email поддержки",
    "timezone": "Часовой пояс",
    "work_start": "Начало работы",
    "work_end": "Конец работы",
}


def _validation_message(error: dict) -> str:
    """Превращает ошибку Pydantic в понятную русскую фразу."""
    field = next((str(p) for p in reversed(error.get("loc", ())) if p != "body"), "")
    name = FIELD_NAMES.get(field, field or "Поле")
    kind = error.get("type", "")
    ctx = error.get("ctx", {})
    if kind == "missing":
        return f"{name}: поле обязательно"
    if kind == "string_too_short":
        return f"{name}: минимум {ctx.get('min_length')} симв."
    if kind == "string_too_long":
        return f"{name}: максимум {ctx.get('max_length')} симв."
    if kind in ("literal_error", "enum"):
        return f"{name}: недопустимое значение"
    if kind == "value_error":
        return str(error.get("msg", "")).removeprefix("Value error, ")
    return f"{name}: {error.get('msg', 'некорректное значение')}"


@app.exception_handler(AppError)
async def app_error_handler(_: Request, exc: AppError):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_: Request, exc: RequestValidationError):
    messages = [_validation_message(e) for e in exc.errors()]
    return JSONResponse(
        status_code=422,
        content={
            "detail": messages[0] if messages else "Проверьте введённые данные",
            "errors": messages,
        },
    )


@app.exception_handler(StarletteHTTPException)  # ловит и HTTPException FastAPI, и 404 от роутера
async def http_error_handler(_: Request, exc: StarletteHTTPException):
    detail = exc.detail if isinstance(exc.detail, str) else "Ошибка запроса"
    if exc.status_code == 404 and detail == "Not Found":
        detail = "Адрес не найден"
    if exc.status_code == 405:
        detail = "Метод не поддерживается для этого адреса"
    return JSONResponse(status_code=exc.status_code, content={"detail": detail})


@app.exception_handler(Exception)
async def unexpected_error_handler(_: Request, exc: Exception):
    print(f"[SupportAI] Непредвиденная ошибка: {exc!r}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Внутренняя ошибка сервера. Подробности смотрите в окне backend."},
    )


app.include_router(system.router)
app.include_router(tickets.router)
app.include_router(knowledge.router)


# Если фронтенд собран (npm run build), backend отдаёт его сам — тогда достаточно одного порта.
if FRONTEND_DIST.is_dir():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def serve_frontend(path: str):
        if path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Адрес не найден")
        candidate = (FRONTEND_DIST / path).resolve()
        if path and candidate.is_file() and FRONTEND_DIST.resolve() in candidate.parents:
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST / "index.html")
