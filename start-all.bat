@echo off
start cmd /k "npm run start:backend"
start cmd /k "npm run start:ml"
start cmd /k "cd client && npm run dev" 