$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "CA OFFICE - FULL DATA RESET" -ForegroundColor Yellow
Write-Host "THIS WILL DELETE ALL APPLICATION DATA." -ForegroundColor Red
Write-Host ""

$answer = Read-Host "Type RESET to continue"

if ($answer -ne "RESET") {
    Write-Host "Cancelled." -ForegroundColor Green
    exit
}

python reset_all_data.py
