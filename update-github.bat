@echo off
if /I not "%~1"=="--run" (
  start "Akkous Git Update" cmd /k ""%~f0" --run"
  exit /b
)

shift
setlocal
title Akkous - Git Update
set "GIT_EDITOR=true"

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
  echo [WARN] Rebase/pull failed. Checking for common generated-file conflicts...
  if exist ".git\rebase-merge" goto :AUTO_REBASE_FIX
  if exist ".git\rebase-apply" goto :AUTO_REBASE_FIX
  goto :REBASE_HELP
)

if exist ".git\rebase-merge" (
  git rebase --continue
  if errorlevel 1 goto :REBASE_HELP
)
if exist ".git\rebase-apply" (
  git rebase --continue
  if errorlevel 1 goto :REBASE_HELP
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
exit /b 0

:AUTO_REBASE_FIX
echo.
echo Detected rebase in progress.
echo Attempting auto-fix for sitemap.xml (generated file)...
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not in PATH.
  goto :REBASE_HELP
)

node scripts/build-recipe-pages.mjs
if errorlevel 1 (
  echo [ERROR] Static build failed. Fix the error, then rerun the .bat.
  goto :REBASE_HELP
)

git add -A
if errorlevel 1 goto :REBASE_HELP

git rebase --continue
if errorlevel 1 goto :REBASE_HELP

echo.
echo Rebase continued successfully.

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
exit /b 0

:REBASE_HELP
echo.
echo [ERROR] Rebase still needs manual conflict resolution.
echo.
echo Run these commands in CMD:
echo   cd /d "%cd%"
echo   node scripts/build-recipe-pages.mjs
echo   git add -A
echo   git rebase --continue
echo   git push origin main
echo.
echo If you want to cancel the rebase:
echo   git rebase --abort
echo.
pause
exit /b 1
