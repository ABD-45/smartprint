@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo   SmartPrint Agent Setup
echo ========================================
echo.
echo This will install the SmartPrint Agent as a background service.
echo Please ensure you run this as Administrator.
echo.

:: Check for admin rights
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Administrator privileges confirmed.
) else (
    echo [ERROR] Please right-click and "Run as Administrator".
    pause
    exit /b 1
)

:: Check if node is installed (optional if using compiled EXE, but good for dev)
where node >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Node.js detected.
    node install-service.js --install
) else (
    echo [INFO] Node.js not found in path. Trying to run compiled agent...
    if exist smart-print-setup.exe (
        smart-print-setup.exe --install
    ) else (
        echo [ERROR] No installer found. Please contact support.
    )
)

echo.
echo Process finished.
pause
