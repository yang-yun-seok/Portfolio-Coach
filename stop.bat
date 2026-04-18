@echo off
set "PATH=%SystemRoot%\System32;%SystemRoot%;%PATH%"
%SystemRoot%\System32\chcp.com 65001 > nul
title Game Career Assistant - 종료

echo.
echo  서버 종료 중...

for /f "tokens=5" %%a in ('%SystemRoot%\System32\netstat.exe -aon 2^>nul ^| %SystemRoot%\System32\findstr.exe ":3002 "') do (
    %SystemRoot%\System32\taskkill.exe /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('%SystemRoot%\System32\netstat.exe -aon 2^>nul ^| %SystemRoot%\System32\findstr.exe ":4173 "') do (
    %SystemRoot%\System32\taskkill.exe /F /PID %%a >nul 2>&1
)

echo  서버가 종료되었습니다.
%SystemRoot%\System32\ping.exe -n 3 127.0.0.1 > nul
