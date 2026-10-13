@echo off
setlocal
echo ========================================================
echo FitVault - Generation du Package et Installeur
echo ========================================================

set INNO_PATH="C:\Program Files (x86)\Inno Setup 6\ISCC.exe"

echo.
echo [1/3] Verification des fichiers et du schema SQL...
if not exist "schema.sql" (
    echo [ERREUR] schema.sql est manquant !
    pause
    exit /b 1
)

echo.
echo [2/3] Verification du compilateur Inno Setup / InstallShield...
if exist %INNO_PATH% (
    echo Compilateur trouve : %INNO_PATH%
    echo Compilation de l'installeur FitVault avec MySQL integre...
    %INNO_PATH% "installer\FitVault_Setup.iss"
    if %ERRORLEVEL% equ 0 (
        echo.
        echo ========================================================
        echo [SUCCES] L'installeur a ete genere dans : dist-installer\
        echo ========================================================
    ) else (
        echo [ERREUR] La compilation de l'installeur a echoue.
    )
) else (
    echo [INFO] Inno Setup 6 n'est pas installe dans le chemin par defaut.
    echo Vous pouvez ouvrir installer\FitVault_Setup.iss ou installer\FitVault_InstallScript.rul
    echo dans votre environnement InstallShield / Inno Setup pour compiler le setup.
)

echo.
pause
