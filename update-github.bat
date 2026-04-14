@echo off
if /I not "%~1"=="--run" (
  start "Akkous Git Update" cmd /k ""%~f0" --run"
  exit /b
)

shift
setlocal
title Akkous - Git Update

REM Always run from this repository folder (where this .bat lives)
cd /d "%~dp0"

echo ==========================================
echo   Akkous GitHub Update Script
echo   Repo: INVOOFFICE/Akkous
echo ==========================================
echo.

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo [ERROR] This folder is not a Git repository.
  echo Current folder: %cd%
  pause
  exit /b 1
)

set "COMMIT_MSG=%~1"
if "%COMMIT_MSG%"=="" set "COMMIT_MSG=Update site content and UI"

echo [1/5] Checking current branch...
for /f "delims=" %%b in ('git branch --show-current') do set "BRANCH=%%b"
if not "%BRANCH%"=="main" (
  echo [WARNING] Current branch is "%BRANCH%" ^(expected: main^).
  choice /M "Continue anyway"
  if errorlevel 2 (
    echo Operation cancelled.
    pause
    exit /b 1
  )
)

echo.
echo [2/5] Staging all changes...
git add -A

echo.
echo [3/5] Creating commit (if needed)...
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "%COMMIT_MSG%"
  if errorlevel 1 (
    echo [ERROR] Commit failed. Resolve issues and retry.
    pause
    exit /b 1
  )
) else (
  echo No local changes to commit.
)

echo.
echo [4/5] Syncing with remote (pull --rebase)...
git pull --rebase origin main
if errorlevel 1 (
  echo [ERROR] Rebase/pull failed. Resolve conflicts, then run again.
  pause
  exit /b 1
)

echo.
echo [5/5] Pushing to GitHub...
git push origin main
if errorlevel 1 (
  echo [ERROR] Push failed.
  pause
  exit /b 1
)

echo.
echo SUCCESS: Project updated on GitHub.
echo.
git status -sb
pause
