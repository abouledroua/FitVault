<#
.SYNOPSIS
    FitVault MySQL & Database Bootstrap Script with File Logging
.DESCRIPTION
    1. Checks if MySQL service/port is available.
    2. If not, attempts to start MySQL service (e.g. wampmysqld64, MySQL, MySQL80, MariaDB).
    3. If MySQL is still not present, offers or downloads MySQL installer / uses winget.
    4. Initializes fitvault_db and runs schema.sql, migrate.js, seed.js if empty.
    5. Writes detailed diagnostic logs to logs\db-setup.log.
#>

[Diagnostics.CodeAnalysis.SuppressMessageAttribute('PSAvoidUsingPlainTextForPassword', 'MySqlRootPassword')]
[Diagnostics.CodeAnalysis.SuppressMessageAttribute('PSAvoidUsingPlainTextForPassword', 'AppPass')]
param(
    [string]$MySqlRootUser = "root",
    [string]$MySqlRootPassword = "",
    [string]$AppUser = "citrus",
    [string]$AppPass = "citrus21012013",
    [string]$DatabaseName = "fitvault_db",
    [string]$SchemaFile = "$PSScriptRoot\..\schema.sql",
    [switch]$Silent
)

$ErrorActionPreference = "Continue"

# Prepare Logs Directory and File
$appRootDir = Resolve-Path "$PSScriptRoot\.."
$logDir = "$appRootDir\logs"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}
$logFile = "$logDir\database-setup.log"

function Write-Log($msg, $color="Cyan", $level="INFO") {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $formattedLog = "[$timestamp] [$level] $msg"
    Write-Host "[FitVault Setup] $msg" -ForegroundColor $color
    try {
        Add-Content -Path $logFile -Value $formattedLog -ErrorAction SilentlyContinue
    } catch {}
}

Write-Log "========================================================" "Cyan" "INFO"
Write-Log "Demarrage de la configuration MySQL & Base de donnees..." "Cyan" "INFO"
Write-Log "Repertoire d'application : $appRootDir" "DarkGray" "INFO"
Write-Log "Fichier de log : $logFile" "DarkGray" "INFO"

# 1. Locate mysql binary if installed
$mysqlExe = Get-Command "mysql.exe" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -First 1

if (-not $mysqlExe) {
    $commonPaths = @(
        "C:\wamp64\bin\mysql\mysql5.7.31\bin\mysql.exe",
        "C:\wamp64\bin\mysql\mysql8.0*\bin\mysql.exe",
        "C:\Program Files\MySQL\MySQL Server *\bin\mysql.exe",
        "C:\Program Files (x86)\MySQL\MySQL Server *\bin\mysql.exe",
        "C:\xampp\mysql\bin\mysql.exe",
        "C:\laragon\bin\mysql\mysql-*\bin\mysql.exe"
    )
    foreach ($p in $commonPaths) {
        $found = Get-Item $p -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($found) {
            $mysqlExe = $found.FullName
            break
        }
    }
}

if ($mysqlExe) {
    Write-Log "Binaire MySQL detecte : $mysqlExe" "Green" "SUCCESS"
} else {
    Write-Log "Binaire mysql.exe introuvable dans les chemins standards." "Yellow" "WARN"
}

# 2. Check if MySQL service is running or can be started
$mysqlServices = @("wampmysqld64", "MySQL", "MySQL80", "MySQL57", "MariaDB", "wampmariadb64")
$anyServiceFound = $false

foreach ($sName in $mysqlServices) {
    $svc = Get-Service -Name $sName -ErrorAction SilentlyContinue
    if ($svc) {
        $anyServiceFound = $true
        Write-Log "Service detecte: $sName (Statut: $($svc.Status))" "Cyan" "INFO"
        if ($svc.Status -ne 'Running') {
            Write-Log "Tentative de demarrage du service $sName..." "Yellow" "INFO"
            try {
                Start-Service -Name $sName -ErrorAction Stop
                Start-Sleep -Seconds 3
                Write-Log "Service $sName demarre avec succes." "Green" "SUCCESS"
            } catch {
                Write-Log "Echec du demarrage du service $sName : $($_.Exception.Message)" "Red" "ERROR"
            }
        }
    }
}

if (-not $anyServiceFound) {
    Write-Log "Aucun service MySQL Windows connu n'a ete trouve." "Yellow" "WARN"
}

# 3. Test port 3306
$portOpen = Test-NetConnection -ComputerName "localhost" -Port 3306 -InformationLevel Quiet -WarningAction SilentlyContinue

if (-not $portOpen) {
    Write-Log "Le port 3306 ne repond pas. Verification de l'installation..." "Yellow" "WARN"
    
    # Check if installer bundle exists in installer\mysql
    $installerMsi = Get-ChildItem -Path "$appRootDir\installer\mysql\*.msi" -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $installerMsi) {
        $installerMsi = Get-ChildItem -Path "$PSScriptRoot\mysql\*.msi" -ErrorAction SilentlyContinue | Select-Object -First 1
    }
    
    if ($installerMsi) {
        Write-Log "Programme d'installation trouve : $($installerMsi.FullName). Lancement de l'installation silencieuse..." "Green" "INFO"
        try {
            $msiProc = Start-Process msiexec.exe -ArgumentList "/i `"$($installerMsi.FullName)`" /qn /norestart" -Wait -PassThru
            Write-Log "Installation MSI terminee avec le code de sortie : $($msiProc.ExitCode)" "Cyan" "INFO"
        } catch {
            Write-Log "Erreur lors de l'installation de MySQL MSI : $($_.Exception.Message)" "Red" "ERROR"
        }
    } elseif (Get-Command winget.exe -ErrorAction SilentlyContinue) {
        Write-Log "Tentative d'installation de MySQL Server via winget..." "Yellow" "INFO"
        try {
            winget install --id Oracle.MySQL --silent --accept-package-agreements --accept-source-agreements
            Write-Log "Commande winget executee." "Cyan" "INFO"
        } catch {
            Write-Log "Erreur winget : $($_.Exception.Message)" "Red" "ERROR"
        }
    } else {
        Write-Log "Aucun installateur MySQL local ou winget disponible pour installer MySQL automatiquement." "Red" "ERROR"
    }
}

# 4. Wait for MySQL to become ready
$retries = 10
while ($retries -gt 0 -and (-not (Test-NetConnection -ComputerName "localhost" -Port 3306 -InformationLevel Quiet -WarningAction SilentlyContinue))) {
    Write-Log "En attente du port 3306 ($retries tentatives restantes)..." "Yellow" "INFO"
    Start-Sleep -Seconds 2
    $retries--
}

$portOpen = Test-NetConnection -ComputerName "localhost" -Port 3306 -InformationLevel Quiet -WarningAction SilentlyContinue
if ($portOpen) {
    Write-Log "Connexion au port MySQL 3306 etablie avec succes." "Green" "SUCCESS"
} else {
    Write-Log "ERREUR CRITIQUE : Le port 3306 reste injoignable apres tentative de demarrage." "Red" "ERROR"
}

# 5. Initialize Database & Users
if ($mysqlExe -and (Test-Path $mysqlExe) -and $portOpen) {
    Write-Log "Initialisation de la base $DatabaseName et utilisateur $AppUser via $mysqlExe..." "Cyan" "INFO"
    
    $initSql = @"
CREATE DATABASE IF NOT EXISTS $DatabaseName CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$AppUser'@'localhost' IDENTIFIED BY '$AppPass';
CREATE USER IF NOT EXISTS '$AppUser'@'%' IDENTIFIED BY '$AppPass';
GRANT ALL PRIVILEGES ON $DatabaseName.* TO '$AppUser'@'localhost';
GRANT ALL PRIVILEGES ON $DatabaseName.* TO '$AppUser'@'%';
FLUSH PRIVILEGES;
"@
    $tempSql = [System.IO.Path]::GetTempFileName() + ".sql"
    [System.IO.File]::WriteAllText($tempSql, $initSql)
    
    # Try with password then without
    $execOutput = & "$mysqlExe" -u $MySqlRootUser -e "source $tempSql" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Log "Connexion root sans mot de passe a echoue. Tentative avec mot de passe..." "Yellow" "WARN"
        if ($MySqlRootPassword) {
            $execOutput = & "$mysqlExe" -u $MySqlRootUser "-p$MySqlRootPassword" -e "source $tempSql" 2>&1
        }
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Log "Base de donnees et privilèges utilisateur configures avec succes." "Green" "SUCCESS"
    } else {
        Write-Log "Erreur lors de la creation de la base/utilisateur : $execOutput" "Red" "ERROR"
    }
    
    # Import schema if tables don't exist
    if (Test-Path $SchemaFile) {
        Write-Log "Application du schema SQL ($SchemaFile)..." "Cyan" "INFO"
        $schemaOutput = & "$mysqlExe" -u $AppUser "-p$AppPass" $DatabaseName -e "source $SchemaFile" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Schema SQL importe avec succes." "Green" "SUCCESS"
        } else {
            Write-Log "Erreur ou avertissement lors de l'import du schema : $schemaOutput" "Yellow" "WARN"
        }
    } else {
        Write-Log "Fichier schema.sql introuvable a l'emplacement : $SchemaFile" "Yellow" "WARN"
    }
    
    Remove-Item $tempSql -Force -ErrorAction SilentlyContinue
} else {
    Write-Log "Configuration via CLI ignoree (mysql.exe indisponible ou port ferme)." "Yellow" "INFO"
}

Write-Log "Fin du script de configuration. Fichier de log enregistre : $logFile" "Green" "INFO"
