@echo off
chcp 65001 >nul
title SeaKingsGames - Puente TikTok Live
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   No tienes Node.js instalado.
  echo   Descargalo de https://nodejs.org  ^(version LTS^) y vuelve a abrir este archivo.
  echo.
  pause
  exit /b
)
if not exist node_modules (
  echo Instalando lo necesario por primera vez, espera un momento...
  call npm install
)
start "" /b cmd /c "timeout /t 3 /nobreak >nul && start "" http://localhost:8787/ahorcado-live.html"
node server.js %*
pause
