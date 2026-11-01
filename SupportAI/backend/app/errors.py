"""Собственные ошибки приложения. Их превращает в JSON-ответы app/main.py."""


class AppError(Exception):
    """Базовая ошибка: понятное сообщение для пользователя + HTTP-код."""

    status_code = 400

    def __init__(self, detail: str):
        super().__init__(detail)
        self.detail = detail


class NotFoundError(AppError):
    status_code = 404


class BadRequestError(AppError):
    status_code = 400
