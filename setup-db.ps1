$ErrorActionPreference = "Stop"

Write-Host "FitVault Database Setup" -ForegroundColor Cyan

# 1. Check if MySQL is running on port 3306
$portResult = Test-NetConnection -ComputerName localhost -Port 3306 -InformationLevel Quiet
if ($portResult) {
    Write-Host "MySQL is running on port 3306." -ForegroundColor Green
    Write-Host "Attempting to initialize database..."
    
    # Try importing schema
    $schemaPath = ".\schema.sql"
    if (Test-Path $schemaPath) {
        Write-Host "Run the following command manually or setup your DB GUI to import schema.sql"
        # In a real environment, we would use mysql CLI here, e.g.,
        # mysql -u root -e "source .\schema.sql"
    }
} else {
    Write-Host "Port 3306 is NOT reachable." -ForegroundColor Yellow
    Write-Host "Starting Docker fallback..."
    
    # Check if docker is available
    if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
        Write-Host "Running docker-compose up -d mysql"
        docker-compose up -d mysql
    } else {
        Write-Host "Docker not found! You can install MySQL silently with:"
        Write-Host "winget install Oracle.MySQL" -ForegroundColor Magenta
    }
}
Write-Host "Done!"
