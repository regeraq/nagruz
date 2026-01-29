# Скрипт для полной перезагрузки проекта на GitHub
# Удаляет все файлы с GitHub и загружает заново

$ErrorActionPreference = "Stop"

# Определяем рабочую директорию
$projectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectPath

Write-Host "📁 Рабочая директория: $projectPath" -ForegroundColor Cyan

# Проверяем наличие Git
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Git не найден! Установите Git." -ForegroundColor Red
    exit 1
}

Write-Host "`n🔍 Проверка статуса Git..." -ForegroundColor Yellow
git status

Write-Host "`n📦 Добавление всех файлов..." -ForegroundColor Yellow
git add -A

Write-Host "`n💾 Коммит изменений..." -ForegroundColor Yellow
$commitMessage = "Complete project rewrite - full update $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
git commit -m $commitMessage

Write-Host "`n🚀 Принудительная загрузка на GitHub..." -ForegroundColor Yellow
Write-Host "⚠️  ВНИМАНИЕ: Это перезапишет всю историю на GitHub!" -ForegroundColor Red
git push origin main --force

Write-Host "`n✅ Готово! Проект полностью загружен на GitHub." -ForegroundColor Green
Write-Host "🔗 Репозиторий: https://github.com/regeraq/nagruz" -ForegroundColor Cyan


