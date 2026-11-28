@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0..\.."

node scripts/cli/console.mjs
if errorlevel 1 (
  echo.
  echo [Error] La consola operativa finalizo con un error.
  pause
)
