@echo off
REM Thin wrapper around the CI desktop build path.
REM Legacy desktop-standalone / electron-packager flow has been removed.
setlocal
cd /d "%~dp0..\.."

echo ===========================================
echo Prompt Optimizer Desktop Build
echo ===========================================
echo Using: pnpm build:desktop:ci
echo.

call pnpm build:desktop:ci
if %errorlevel% neq 0 (
    echo Desktop build failed!
    exit /b 1
)

echo.
echo ===========================================
echo Build completed successfully!
echo Artifacts: packages\desktop\dist\
echo ===========================================
endlocal
