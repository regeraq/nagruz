# 🚀 БЫСТРАЯ НАСТРОЙКА АВТОМАТИЧЕСКОГО ДЕПЛОЯ

## Что это дает?

После настройки, каждый раз когда вы делаете `git push`, изменения **автоматически** появятся на сервере через 1-2 минуты!

## 📋 Пошаговая инструкция

### Шаг 1: Генерация SSH ключа на сервере

Подключитесь к серверу и выполните:

```bash
ssh deploy@YOUR_SERVER_IP
# или
ssh root@YOUR_SERVER_IP

# Генерация SSH ключа
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy -N ""

# Просмотр публичного ключа (добавим его в authorized_keys)
cat ~/.ssh/github_actions_deploy.pub >> ~/.ssh/authorized_keys

# Просмотр приватного ключа (СКОПИРУЙТЕ ВЕСЬ ТЕКСТ!)
cat ~/.ssh/github_actions_deploy
```

**Важно:** Скопируйте весь текст приватного ключа (начинается с `-----BEGIN OPENSSH PRIVATE KEY-----`)

### Шаг 2: Настройка GitHub Secrets

1. Откройте ваш репозиторий: https://github.com/regeraq/nagruz
2. Перейдите в **Settings** → **Secrets and variables** → **Actions**
3. Нажмите **New repository secret**
4. Добавьте следующие секреты:

   | Имя | Значение | Пример |
   |-----|----------|--------|
   | `SERVER_HOST` | IP вашего сервера | `46.17.105.24` |
   | `SERVER_USER` | Имя пользователя | `deploy` |
   | `SERVER_PORT` | Порт SSH | `22` |
   | `SSH_PRIVATE_KEY` | Приватный ключ (весь текст) | `-----BEGIN OPENSSH PRIVATE KEY-----...` |

### Шаг 3: Проверка работы

1. Сделайте любое изменение в коде (например, измените текст в README.md)
2. Закоммитьте и запушьте:
   ```bash
   git add .
   git commit -m "Test auto-deploy"
   git push origin main
   ```
3. Перейдите в **Actions** на GitHub
4. Вы увидите запущенный workflow "Deploy to Server"
5. Через 1-2 минуты изменения появятся на сервере!

## ✅ Готово!

Теперь каждый `git push` автоматически обновит сайт на сервере.

## 🔍 Проверка логов

**На GitHub:**
- **Actions** → выберите последний workflow → просмотрите логи

**На сервере:**
```bash
# Логи приложения
pm2 logs loaddevice

# Статус приложения
pm2 status
```

## 🆘 Если что-то не работает

1. Проверьте, что все Secrets настроены правильно
2. Проверьте логи в GitHub Actions
3. Убедитесь, что SSH ключ добавлен в `authorized_keys`
4. Проверьте права доступа: `chmod 600 ~/.ssh/github_actions_deploy`

## 📚 Подробная документация

См. раздел "АВТОМАТИЧЕСКИЙ ДЕПЛОЙ" в `DEPLOYMENT_GUIDE.md`









