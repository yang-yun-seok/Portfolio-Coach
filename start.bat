@echo off
set "PATH=%SystemRoot%\System32;%SystemRoot%;%PATH%;C:\Program Files\nodejs"
title Game Career Assistant
cd /d "%~dp0"

echo.
echo  ========================================
echo   Game Career Assistant Starting...
echo  ========================================
echo.

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js not found.
    echo          Please install from https://nodejs.org
    pause
    exit /b 1
)

:: Auto install dependencies if missing
if not exist "node_modules\express\" goto :DO_INSTALL
if not exist "node_modules\puppeteer-core\" goto :DO_INSTALL
goto :SKIP_INSTALL

:DO_INSTALL
echo  [*] Dependencies missing. Running npm install...
echo      This may take a minute on first run.
echo.
call npm install --no-audit --no-fund
echo.
if not exist "node_modules\puppeteer-core\" (
    echo  [ERROR] npm install failed. puppeteer-core not found.
    echo          Please check your network connection and try again.
    pause
    exit /b 1
)
echo  [OK] Dependencies installed successfully!
echo.

:SKIP_INSTALL
echo  [OK] Dependencies ready.

:: Clean up ports
echo  [*] Cleaning ports...
for /f "tokens=5" %%a in ('%SystemRoot%\System32\netstat.exe -aon 2^>nul ^| %SystemRoot%\System32\findstr.exe ":3002 "') do %SystemRoot%\System32\taskkill.exe /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('%SystemRoot%\System32\netstat.exe -aon 2^>nul ^| %SystemRoot%\System32\findstr.exe ":4173 "') do %SystemRoot%\System32\taskkill.exe /F /PID %%a >nul 2>&1

%SystemRoot%\System32\ping.exe -n 2 127.0.0.1 > nul

:: Start backend server
echo  [*] Starting backend (port 3002)...
start "Backend - Game Career Assistant" /min cmd /c "node server.js"

%SystemRoot%\System32\ping.exe -n 3 127.0.0.1 > nul

:: Start frontend server
echo  [*] Starting frontend (port 4173)...
start "Frontend - Game Career Assistant" /min cmd /c "node start-dev.js"

%SystemRoot%\System32\ping.exe -n 4 127.0.0.1 > nul

:: Open browser
echo  [*] Opening browser...
start "" "http://localhost:4173"

echo.
echo  ========================================
echo   [OK] App started!
echo.
echo   URL: http://localhost:4173
echo.
echo   Close this window to stop.
echo  ========================================
echo.
pause
