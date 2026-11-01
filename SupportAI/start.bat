@echo off
chcp 65001 >nul
setlocal
title SupportAI - запуск
cd /d "%~dp0"

echo.
echo  ============================================
echo    SupportAI - платформа поддержки клиентов
echo  ============================================
echo.

rem ---------- Проверка Python ----------
set "PY="
py -3 --version >nul 2>nul
if not errorlevel 1 set "PY=py -3"
if not defined PY python --version >nul 2>nul
if not defined PY if not errorlevel 1 set "PY=python"
if not defined PY goto no_python

%PY% -c "import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)" >nul 2>nul
if errorlevel 1 goto old_python

rem ---------- Проверка Node.js ----------
node --version >nul 2>nul
if errorlevel 1 goto no_node
node scripts\check-node.cjs
if errorlevel 1 goto end_wait

rem ---------- Файл настроек ----------
if not exist ".env" copy ".env.example" ".env" >nul

rem ---------- Шаг 1: Python-библиотеки ----------
if not exist ".venv\Scripts\python.exe" (
    echo [1/3] Создаю виртуальное окружение Python...
    %PY% -m venv .venv
    if errorlevel 1 goto venv_failed
)
if exist ".venv\.deps-ok" goto python_ready
echo [1/3] Устанавливаю библиотеки backend. Это нужно один раз, около минуты...
".venv\Scripts\python.exe" -m pip install --disable-pip-version-check -r requirements.txt
if errorlevel 1 goto pip_failed
echo ok> ".venv\.deps-ok"
:python_ready

rem ---------- Шаг 2: библиотеки интерфейса ----------
if exist "frontend\node_modules\.deps-ok" goto node_ready
echo [2/3] Устанавливаю библиотеки интерфейса. Это нужно один раз, 2-5 минут...
pushd frontend
call npm install --no-audit --no-fund
set "NPM_RESULT=%errorlevel%"
popd
if not "%NPM_RESULT%"=="0" goto npm_failed
echo ok> "frontend\node_modules\.deps-ok"
:node_ready

rem ---------- Шаг 3: запуск ----------
echo [3/3] Запускаю SupportAI...
start "SupportAI Backend" cmd /k ".venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --reload --reload-dir backend --port 8000"
start "SupportAI Frontend" /d "%~dp0frontend" cmd /k "npm run dev"

echo.
echo  Жду запуск серверов (около 8 секунд)...
timeout /t 8 /nobreak >nul
start "" http://localhost:5173

echo.
echo  Готово! Сайт открылся в браузере: http://localhost:5173
echo  Если страница пустая или с ошибкой - подождите пару секунд и нажмите F5.
echo.
echo  Документация API: http://127.0.0.1:8000/docs
echo.
echo  Чтобы остановить проект, закройте два чёрных окна:
echo  "SupportAI Backend" и "SupportAI Frontend".
echo.
goto end_wait

:no_python
echo  [Ошибка] Python не найден.
echo.
echo  Скачайте Python 3.12 или новее с https://www.python.org/downloads/
echo  При установке ОБЯЗАТЕЛЬНО поставьте галочку "Add python.exe to PATH".
echo  Затем запустите start.bat снова.
goto end_wait

:old_python
echo  [Ошибка] Версия Python слишком старая. Нужна 3.10 или новее.
echo  Скачайте новую версию с https://www.python.org/downloads/ и запустите start.bat снова.
goto end_wait

:no_node
echo  [Ошибка] Node.js не найден.
echo.
echo  Скачайте Node.js с https://nodejs.org (кнопка LTS) и установите.
echo  Затем запустите start.bat снова.
goto end_wait

:venv_failed
echo  [Ошибка] Не удалось создать виртуальное окружение Python.
echo  Попробуйте удалить папку .venv и запустить start.bat снова.
goto end_wait

:pip_failed
echo.
echo  [Ошибка] Не удалось установить библиотеки Python. Проверьте интернет и запустите start.bat снова.
goto end_wait

:npm_failed
echo.
echo  [Ошибка] Не удалось установить библиотеки интерфейса. Проверьте интернет и запустите start.bat снова.
echo  Если ошибка повторяется, удалите папку frontend\node_modules и попробуйте ещё раз.
goto end_wait

:end_wait
echo.
pause
endlocal
