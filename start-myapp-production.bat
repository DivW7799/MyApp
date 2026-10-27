
@echo off
setlocal

cd /d "%~dp0backend"

set "PYTHON=%~dp0backend\.venv\Scripts\python.exe"
set "LOGDIR=%~dp0backend\logs"

if not exist "%PYTHON%" (
    echo ERROR: Backend virtual environment not found.
    echo Expected: %PYTHON%
    exit /b 1
)

if not exist "%LOGDIR%" mkdir "%LOGDIR%"

echo Starting MyApp production server...
echo Working directory: %CD%

"%PYTHON%" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 >> "%LOGDIR%\server.log" 2>&1

echo MyApp server stopped. Check backend\logs\server.log
pause
