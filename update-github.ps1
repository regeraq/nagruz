# Скрипт для обновления проекта на GitHub

Write-Host "🔄 Обновление проекта на GitHub" -ForegroundColor Green
Write-Host ""

# Получение директории скрипта
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Host "📁 Директория проекта: $scriptDir" -ForegroundColor Cyan
Write-Host ""

# Проверка Git
$gitPath = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitPath) {
    Write-Host "❌ Git не найден!" -ForegroundColor Red
    Write-Host "Установите Git: https://git-scm.com/download/win" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Git найден" -ForegroundColor Green
Write-Host ""

# Проверка репозитория
if (-not (Test-Path ".git")) {
    Write-Host "📦 Инициализация Git репозитория..." -ForegroundColor Yellow
    git init
    git remote add origin https://github.com/regeraq/nagruz.git
    Write-Host "✅ Репозиторий инициализирован" -ForegroundColor Green
} else {
    Write-Host "✅ Git репозиторий найден" -ForegroundColor Green
}

Write-Host ""

# Проверка remote
$remoteUrl = git remote get-url origin 2>$null
if (-not $remoteUrl) {
    Write-Host "📡 Добавление remote..." -ForegroundColor Yellow
    git remote add origin https://github.com/regeraq/nagruz.git
} else {
    Write-Host "📡 Remote: $remoteUrl" -ForegroundColor Cyan
}

Write-Host ""

# Получение последних изменений
Write-Host "📥 Получение последних изменений с GitHub..." -ForegroundColor Cyan
git fetch origin main 2>&1 | Out-Null

Write-Host ""

# Добавление только файлов проекта (игнорируя системные файлы)
Write-Host "➕ Добавление изменений..." -ForegroundColor Cyan
git add -A

Write-Host ""

# Показ статуса
Write-Host "📊 Статус изменений:" -ForegroundColor Cyan
git status --short

Write-Host ""

# Проверка, есть ли изменения для коммита
$status = git status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "ℹ️  Нет изменений для коммита" -ForegroundColor Yellow
    exit 0
}

# Коммит
Write-Host "💾 Создание коммита..." -ForegroundColor Cyan
$commitMessage = "Update: Site improvements and fixes"
git commit -m $commitMessage

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Ошибка создания коммита" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Коммит создан" -ForegroundColor Green
Write-Host ""

# Push на GitHub
Write-Host "🚀 Загрузка на GitHub..." -ForegroundColor Cyan
Write-Host "Может потребоваться ввод учетных данных" -ForegroundColor Yellow
Write-Host ""

git branch -M main 2>$null
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Проект успешно обновлен на GitHub!" -ForegroundColor Green
    Write-Host "🔗 Репозиторий: https://github.com/regeraq/nagruz" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📝 Следующий шаг: Обновите код на сервере:" -ForegroundColor Yellow
    Write-Host "   ssh root@45.9.72.103" -ForegroundColor White
    Write-Host "   cd /var/www/loaddevice" -ForegroundColor White
    Write-Host "   git pull origin main" -ForegroundColor White
    Write-Host "   npm install" -ForegroundColor White
    Write-Host "   npm run build" -ForegroundColor White
    Write-Host "   pm2 restart loaddevice" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "❌ Ошибка при загрузке" -ForegroundColor Red
    Write-Host "Проверьте учетные данные GitHub" -ForegroundColor Yellow
}


