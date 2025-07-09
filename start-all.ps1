Write-Host "Starting Smart Retail 360 - All Services..." -ForegroundColor Green
Write-Host ""
Write-Host "This will start:" -ForegroundColor Yellow
Write-Host "- Backend Server (Port 5000)" -ForegroundColor Cyan
Write-Host "- ML Service (Port 8001)" -ForegroundColor Cyan
Write-Host "- Frontend Dev Server (Port 5173)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Red
Write-Host ""

try {
    npm run start:all
}
catch {
    Write-Host "Error starting services: $_" -ForegroundColor Red
    Read-Host "Press Enter to exit"
} 