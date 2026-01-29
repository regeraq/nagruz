# Script for automatic upload to GitHub
# Usage: .\update-github.ps1

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  UPDATE PROJECT ON GITHUB" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Get current directory (script should be run from project root)
$projectPath = Get-Location
Write-Host "Project directory: $projectPath" -ForegroundColor Green
Write-Host ""

# Check Git status
Write-Host "Checking Git status..." -ForegroundColor Yellow
$status = git status --short

if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "No changes to upload" -ForegroundColor Green
    exit 0
}

Write-Host "Found changes:" -ForegroundColor Yellow
git status --short
Write-Host ""

# Add all changes
Write-Host "Adding changes..." -ForegroundColor Yellow
git add .
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to add files" -ForegroundColor Red
    exit 1
}
Write-Host "Files added successfully" -ForegroundColor Green
Write-Host ""

# Request commit message
$commitMessage = Read-Host "Enter commit message (or press Enter for default)"
if ([string]::IsNullOrWhiteSpace($commitMessage)) {
    $commitMessage = "Update project code"
}

# Create commit
Write-Host "Creating commit..." -ForegroundColor Yellow
git commit -m $commitMessage
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to create commit" -ForegroundColor Red
    exit 1
}
Write-Host "Commit created: $commitMessage" -ForegroundColor Green
Write-Host ""

# Fetch latest changes from GitHub
Write-Host "Fetching latest changes from GitHub..." -ForegroundColor Yellow
git fetch origin
if ($LASTEXITCODE -ne 0) {
    Write-Host "Warning: Failed to fetch from GitHub" -ForegroundColor Yellow
}

# Check if pull is needed
$localCommit = git rev-parse HEAD
$remoteCommit = git rev-parse origin/main 2>$null

if ($LASTEXITCODE -eq 0 -and $localCommit -ne $remoteCommit) {
    Write-Host "Changes detected on GitHub. Syncing..." -ForegroundColor Yellow
    git pull origin main --no-edit
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Merge conflict. Please resolve manually." -ForegroundColor Red
        exit 1
    }
    Write-Host "Sync completed" -ForegroundColor Green
    Write-Host ""
}

# Push changes to GitHub
Write-Host "Pushing changes to GitHub..." -ForegroundColor Yellow
git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to push to GitHub" -ForegroundColor Red
    Write-Host "Try manually: git push origin main" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  UPDATE COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Get short commit hash
$commitHash = git rev-parse --short HEAD
Write-Host "Current commit: $commitHash" -ForegroundColor Cyan
Write-Host ""
