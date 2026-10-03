@echo off
title Bites & Clicks Web Server
echo Starting Bites & Clicks local development server...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
pause
