#Requires -Version 5.1
<#
.SYNOPSIS
    Fix FOUC black arc issue on Akkous site by adding width="0" height="0"
    to theme SVGs (<svg data-icon="moon"> and <svg data-icon="sun">).
.DESCRIPTION
    During page load, the moon SVG renders unstyled (currentColor = black,
    no CSS dimensions) causing a visible black arc. Adding width="0"
    height="0" as SVG attributes hides them until style.css loads and
    overrides with proper dimensions via CSS.
.NOTES
    Author : AI Assistant
    Version: 1.0
    Usage  : .\fix-fouc-arc.ps1
#>

# ============================================================
# CONFIGURATION
# ============================================================
$script:projectRoot = "C:\Users\M2B PRO\Desktop\Akkous-main"
$script:timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$script:backupFolder = "backup-$timestamp"
$script:backupPath = Join-Path $script:projectRoot $script:backupFolder
$script:logFile = Join-Path $script:projectRoot "fouc-fix-log.txt"

# Stats
$script:totalFiles = 0
$script:modifiedFiles = 0
$script:skippedFiles = 0
$script:errorFiles = 0
$script:totalSvgFixed = 0

# ============================================================
# FUNCTIONS
# ============================================================

function Write-Log {
    param([string]$Message)

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] $Message"

    Write-Output $line

    $logDir = Split-Path $script:logFile -Parent
    if (-not (Test-Path -LiteralPath $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }
    Add-Content -Path $script:logFile -Value $line -Encoding UTF8
}

function Backup-Files {
    Write-Log "Creating backup in $script:backupFolder ..."

    try {
        New-Item -ItemType Directory -Path $script:backupPath -Force | Out-Null

        $files = Get-ChildItem -Path $script:projectRoot -Recurse -Filter "*.html" |
                 Where-Object { $_.FullName -notmatch "\\backup-" }

        $count = 0
        foreach ($file in $files) {
            $relativePath = $file.FullName.Substring($script:projectRoot.Length).TrimStart('\')
            $destDir = Join-Path $script:backupPath (Split-Path $relativePath)

            if (-not (Test-Path -LiteralPath $destDir)) {
                New-Item -ItemType Directory -Path $destDir -Force | Out-Null
            }

            Copy-Item -LiteralPath $file.FullName -Destination (Join-Path $destDir $file.Name) -Force
            $count++
        }

        Write-Log "Backup complete: $count HTML file(s) copied to $script:backupFolder"
    } catch {
        Write-Log "BACKUP ERROR: $_"
        throw "Backup failed: $_"
    }
}

function Add-SvgAttributes {
    param([string]$FilePath)

    try {
        $content = [System.IO.File]::ReadAllText($FilePath)
        $original = $content

        # Pattern: <svg ... data-icon="moon" ... > or <svg ... data-icon="sun" ... >
        $regex = [regex] '<svg\s[^>]*?data-icon=["''](?:moon|sun)["''][^>]*?(/\s*)?>'

        # Count matching SVGs before replacement
        $matchedCount = ($regex.Matches($content) | Where-Object {
            $tag = $_.Value
            -not ($tag -match '(?<!\S)width\s*=') -or -not ($tag -match '(?<!\S)height\s*=')
        } | Measure-Object).Count

        $result = $regex.Replace($content, {
            param($m)
            $tag = $m.Value

            if (($tag -match '(?<!\S)width\s*=') -and ($tag -match '(?<!\S)height\s*=')) {
                return $tag
            }

            $attrs = ''
            if (-not ($tag -match '(?<!\S)width\s*=')) {
                $attrs += ' width="0"'
            }
            if (-not ($tag -match '(?<!\S)height\s*=')) {
                $attrs += ' height="0"'
            }

            $script:totalSvgFixed++

            return $tag -replace '(/\s*)?>$', ($attrs + '$1>')
        })

        if ($result -ne $original) {
            [System.IO.File]::WriteAllText($FilePath, $result, [System.Text.UTF8Encoding]::new($false))
            Write-Log "MODIFIED: $FilePath ($matchedCount SVG(s) fixed)"
            $script:modifiedFiles++
        } else {
            $script:skippedFiles++
        }
        $script:totalFiles++
    } catch {
        Write-Log "ERROR: $FilePath -- $_"
        $script:errorFiles++
        $script:totalFiles++
    }
}

function Show-Summary {
    $now = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $summary = "`n"
    $summary += "========== FOUC FIX SUMMARY ==========`n"
    $summary += "  Date              : $now`n"
    $summary += "  Project root      : $script:projectRoot`n"
    $summary += "  Backup folder     : $script:backupFolder`n"
    $summary += "  Log file          : fouc-fix-log.txt`n"
    $summary += "  -------------------------------------`n"
    $summary += "  Total files scanned : $script:totalFiles`n"
    $summary += "  Files modified      : $script:modifiedFiles`n"
    $summary += "  Files skipped       : $script:skippedFiles`n"
    $summary += "  Files with errors   : $script:errorFiles`n"
    $summary += "  SVG tags fixed      : $script:totalSvgFixed`n"
    $summary += "========================================`n"
    Write-Output $summary
    Add-Content -Path $script:logFile -Value $summary -Encoding UTF8
}

function Test-AdminRights {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($id)
    $isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if (-not $isAdmin) {
        Write-Warning "Not running as Administrator. If you encounter permission errors, re-run as Admin."
    }
}

# ============================================================
# MAIN
# ============================================================
try {
    if (Test-Path -LiteralPath $script:logFile) {
        Remove-Item -LiteralPath $script:logFile -Force
    }

    Test-AdminRights

    Write-Log "============================================"
    Write-Log "FOUC ARC FIX -- Solution 1"
    Write-Log "Adding width=0 height=0 to theme SVGs"
    Write-Log "============================================"
    Write-Log ""

    Write-Log "[1/3] Creating backup..."
    Backup-Files
    Write-Log ""

    Write-Log "[2/3] Scanning and fixing HTML files..."
    $htmlFiles = Get-ChildItem -Path $script:projectRoot -Recurse -Filter "*.html" |
                 Where-Object { $_.FullName -notmatch "\\backup-" }

    $fileCount = ($htmlFiles | Measure-Object).Count
    Write-Log "Found $fileCount HTML file(s) to scan."
    Write-Log ""

    foreach ($file in $htmlFiles) {
        Add-SvgAttributes -FilePath $file.FullName
    }
    Write-Log ""

    Write-Log "[3/3] Done."
    Write-Log ""
    Show-Summary

} catch {
    Write-Log "FATAL ERROR: $_"
    Write-Error "Script terminated with error: $_"
    exit 1
}
