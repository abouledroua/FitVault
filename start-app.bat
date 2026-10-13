@echo off
setlocal
cd /d "%~dp0"

:: If packaged FitVault.exe exists, launch it directly
if exist "%~dp0FitVault.exe" (
    start "" "%~dp0FitVault.exe"
    exit
)

:: Start modern WPF UI launcher without console window
if exist "installer\scripts\launcher-ui.ps1" (
    powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -NoProfile -File "%~dp0installer\scripts\launcher-ui.ps1"
) else (
    start http://localhost:3000
)
exit
