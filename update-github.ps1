# Script for automatic upload to GitHub
# Usage:
#   .\update-github.ps1                          - interactive (asks for commit message)
#   .\update-github.ps1 -Message "fix login"     - non-interactive with message
#   .\update-github.ps1 -Yes                     - non-interactive with default message
#   .\update-github.ps1 -Branch main             - explicit branch (default: main)

[CmdletBinding()]
param(
    [string]$Message = "",
    [switch]$Yes,
    [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"

function Write-Step($text) { Write-Host $text -ForegroundColor Yellow }
function Write-Ok($text)   { Write-Host $text -ForegroundColor Green  }
function Write-Fail($text) { Write-Host $text -ForegroundColor Red    }
function Write-Info($text) { Write-Host $text -ForegroundColor Cyan   }

function Die($text) {
    Write-Host ""
    Write-Fail "=========================================="
    Write-Fail ("  ERROR: " + $text)
    Write-Fail "=========================================="
    exit 1
}

Write-Info "=========================================="
Write-Info "  UPDATE PROJECT ON GITHUB"
Write-Info "=========================================="
Write-Host ""

# 0. Make sure we are inside a git repository
& git rev-parse --is-inside-work-tree *> $null
if ($LASTEXITCODE -ne 0) {
    Die ("Current folder is not a git repository: " + (Get-Location).Path)
}

$projectPath = (Get-Location).Path
$repoRoot    = (& git rev-parse --show-toplevel).Trim()
Write-Host ("Project directory:  " + $projectPath) -ForegroundColor Green
Write-Host ("Git repo root:      " + $repoRoot)    -ForegroundColor Green
Write-Host ("Target branch:      " + $Branch)      -ForegroundColor Green
Write-Host ""

# 1. Check git author is configured
$userName  = (& git config user.name)
$userEmail = (& git config user.email)
if ([string]::IsNullOrWhiteSpace($userName) -or [string]::IsNullOrWhiteSpace($userEmail)) {
    Die "Git author not configured. Run: git config --global user.name / user.email"
}
Write-Host ("Git author: " + $userName + " <" + $userEmail + ">") -ForegroundColor DarkGray
Write-Host ""

# 2. Look at changes
Write-Step "Checking Git status..."
$status = & git status --short
$hasUnstaged = -not [string]::IsNullOrWhiteSpace($status)

if (-not $hasUnstaged) {
    & git diff --cached --quiet
    $indexDirty = ($LASTEXITCODE -ne 0)
    if (-not $indexDirty) {
        Write-Ok "Working tree and index are clean. Nothing to do."
        exit 0
    } else {
        Write-Step "Working tree is clean, but index has staged changes from a previous run. Will commit them."
    }
} else {
    Write-Host "Found changes:" -ForegroundColor Yellow
    & git status --short
    Write-Host ""
}

# 3. git add (only if there are unstaged changes)
if ($hasUnstaged) {
    Write-Step "Staging all changes..."
    & git add -A
    if ($LASTEXITCODE -ne 0) { Die "git add failed" }
    Write-Ok "Files added to index."
    Write-Host ""
}

# 4. Sanity-check: anything actually staged?
& git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
    Write-Ok "No staged changes after add. Nothing to commit."
    exit 0
}

# 5. Commit message
if ([string]::IsNullOrWhiteSpace($Message)) {
    if ($Yes) {
        $Message = "Update project code"
    } else {
        Write-Host ""
        $Message = Read-Host "Enter commit message (or press Enter for default)"
        if ([string]::IsNullOrWhiteSpace($Message)) { $Message = "Update project code" }
    }
}
Write-Host ""

# 6. Commit + verify it really happened
Write-Step "Creating commit..."
& git commit -m $Message
$commitExit = $LASTEXITCODE

& git diff --cached --quiet
$stillStaged = ($LASTEXITCODE -ne 0)

if ($commitExit -ne 0 -or $stillStaged) {
    Die "Commit did not succeed. Staged changes still present. Run 'git status' to debug. Nothing was pushed."
}
$commitHash = (& git rev-parse --short HEAD).Trim()
Write-Ok ("Commit created: " + $commitHash + " - " + $Message)
Write-Host ""

# 7. Fetch + rebase if remote has new commits
Write-Step "Fetching from origin..."
& git fetch origin
if ($LASTEXITCODE -ne 0) {
    Write-Host "Warning: fetch failed (no network?). Will still try push." -ForegroundColor Yellow
}

$remoteRef = "origin/" + $Branch
& git rev-parse --verify $remoteRef *> $null
if ($LASTEXITCODE -eq 0) {
    $localSha  = (& git rev-parse HEAD).Trim()
    $remoteSha = (& git rev-parse $remoteRef).Trim()
    $baseSha   = (& git merge-base HEAD $remoteRef).Trim()

    if ($remoteSha -ne $baseSha -and $localSha -ne $remoteSha) {
        Write-Step "Remote has new commits. Pulling with rebase..."
        & git pull --rebase origin $Branch
        if ($LASTEXITCODE -ne 0) {
            Die "Rebase failed. Resolve conflicts manually, then run: git rebase --continue; git push origin $Branch"
        }
        Write-Ok "Rebase completed."
        Write-Host ""
    }
}

# 8. Push
Write-Step ("Pushing to origin/" + $Branch + "...")
& git push origin $Branch
if ($LASTEXITCODE -ne 0) {
    Die ("git push failed. Try manually: git push origin " + $Branch)
}

# 9. Final sync check
& git fetch origin $Branch *> $null
$localFinal  = (& git rev-parse HEAD).Trim()
$remoteFinal = (& git rev-parse $remoteRef).Trim()

if ($localFinal -ne $remoteFinal) {
    Die ("After push HEAD (" + $localFinal + ") != " + $remoteRef + " (" + $remoteFinal + "). Something went wrong.")
}

Write-Host ""
Write-Info "=========================================="
Write-Ok   "  UPDATE COMPLETED SUCCESSFULLY!"
Write-Info "=========================================="
Write-Host ""
Write-Info ("Commit:  " + (& git rev-parse --short HEAD) + "  (" + $Message + ")")
Write-Info ("Remote:  " + $remoteRef + " is now at " + (& git rev-parse --short $remoteRef))
Write-Host ""
Write-Host "Next step - update the server:" -ForegroundColor DarkGray
Write-Host "  ssh root@45.9.72.103 `"bash /var/www/loaddevice/update-project.sh`"" -ForegroundColor DarkGray
Write-Host ""
