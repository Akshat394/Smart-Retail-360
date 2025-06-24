# PowerShell script to start all parts of the Smart Retail 360 app
# Usage: Right-click and 'Run with PowerShell' or run from a PowerShell terminal

$env:DATABASE_URL = "postgresql://neondb_owner:npg_2cDWvpVSyzm5@ep-royal-mouse-a8ipcgzu-pooler.eastus2.azure.neon.tech/neondb?sslmode=require"

# Start backend
Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", "cd $PSScriptRoot; npm run dev"

# Start ML service
Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", "cd $PSScriptRoot/ml_service; pip install -r requirements.txt; uvicorn main:app --reload --port 8000"

# Start frontend
Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", "cd $PSScriptRoot/client; npm install; npm run dev"

Write-Host "All services are starting in separate windows." 