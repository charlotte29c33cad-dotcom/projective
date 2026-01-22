# Инструкция по загрузке игры во ВКонтакте

## Шаг 1: Создание VK Mini App

1. Откройте https://vk.com/dev
2. Нажмите "Создать приложение" (или "Create Application")
3. Заполните форму:
   - **Название**: ваше название игры (например, "VK Game")
   - **Платформа**: выберите "Mini App" или "Standalone приложение"
   - **Категория**: "Игры"
4. После создания вы попадете в настройки приложения
5. **Скопируйте APP ID** (числовой идентификатор) - он понадобится позже

### Настройки приложения ВКонтакте

В настройках приложения укажите:
- **Адрес iFrame приложения**: `https://charlotte29c33cad-dotcom.github.io/projective/index.html`
- **Разрешенные адреса для API**: `https://charlotte29c33cad-dotcom.github.io`
- **Ширина окна приложения**: 800-1200px (рекомендуется 1000px)

---

## Шаг 2: Получение Service Account для Firebase

1. Откройте Firebase Console: https://console.firebase.google.com
2. Выберите ваш проект
3. Перейдите в **Project Settings** (⚙️) → **Service accounts**
4. Нажмите "Generate new private key"
5. Сохраните JSON файл - он содержит ключи для доступа к Firebase
6. **Важно**: Содержимое этого файла понадобится для настройки сервера

---

## Шаг 3: Деплой сервера авторизации на Render.com

### 3.1 Регистрация на Render

1. Откройте https://render.com
2. Зарегистрируйтесь (можно через GitHub аккаунт)
3. Подтвердите email

### 3.2 Создание Web Service

1. На главной странице Render нажмите **"New +"** → **"Web Service"**
2. Подключите ваш GitHub репозиторий:
   - Нажмите "Connect account" для GitHub
   - Выберите репозиторий `charlotte29c33cad-dotcom/projective`
3. Настройте сервис:
   - **Name**: `vk-game-auth-server` (или любое другое имя)
   - **Region**: выберите ближайший регион (Europe для лучшей производительности)
   - **Branch**: `main`
   - **Root Directory**: `server` ⚠️ **Важно!**
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
   - **Plan**: Free (бесплатный план)

### 3.3 Добавление переменных окружения

В разделе **Environment Variables** добавьте:

**Вариант 1: Service Account как JSON**
```
GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/serviceAccountKey.json
```
И затем в разделе **Secret Files** создайте файл:
- **Filename**: `serviceAccountKey.json`
- **Contents**: вставьте полное содержимое JSON файла, который вы скачали из Firebase

**Вариант 2: Inline credentials (проще)**
Можно добавить переменные напрямую из JSON файла:
```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIE...(ваш ключ)...\n-----END PRIVATE KEY-----\n
```

### 3.4 Деплой

1. Нажмите **"Create Web Service"**
2. Дождитесь завершения деплоя (займет 2-5 минут)
3. После успешного деплоя вы увидите зеленую галочку и статус "Live"
4. **Скопируйте URL** вашего сервиса (будет вида `https://vk-game-auth-server.onrender.com`)

**⚠️ Если видите ошибку "Cannot find module":**
- Убедитесь, что **Root Directory** установлен в `server`
- Убедитесь, что **Start Command** установлен в `node index.js` (без "server/" в пути)
- Проверьте логи: если видите другую ошибку, напишите мне для помощи

### 3.5 Проверка работы сервера

Откройте в браузере:
```
https://your-service-name.onrender.com/health
```
Должны увидеть: `{"status":"ok"}`

---

## Шаг 4: Обновление конфигурации клиента

После получения APP_ID и URL сервера, обновите `game.js`:

```javascript
// В начале файла найдите и замените:
const VK_APP_ID = 12345678; // ← замените на ваш реальный APP ID
const AUTH_SERVER_URL = 'https://vk-game-auth-server.onrender.com'; // ← замените на URL вашего сервера
```

Закоммитьте и запушьте изменения:
```bash
git add game.js
git commit -m "feat: configure VK app ID and auth server URL"
git push origin main
```

GitHub Pages автоматически обновится через 1-2 минуты.

---

## Шаг 5: Настройка Firebase Database Rules

1. Откройте Firebase Console → **Realtime Database** → **Rules**
2. Замените правила на:

```json
{
  "rules": {
    "players": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    }
  }
}
```

3. Нажмите **"Publish"**

Эти правила позволяют каждому пользователю читать и записывать только свои данные.

---

## Шаг 6: Тестирование

### Локальное тестирование
Игра уже работает локально на http://127.0.0.1:8080

### Тестирование во ВКонтакте

1. Откройте настройки вашего VK приложения
2. Найдите **"Тестовый режим"** или кнопку тестирования
3. Нажмите "Открыть приложение" - игра откроется внутри ВКонтакте
4. Проверьте:
   - Загружается ли игра
   - Работает ли сохранение прогресса (попробуйте купить что-то и обновить страницу)
   - Появляется ли ваш VK ID в консоли (нажмите D для дебаг панели)

### Отладка

Если что-то не работает:

1. **Откройте консоль браузера** (F12)
2. Проверьте наличие ошибок
3. Проверьте Network tab - все ли запросы успешны
4. Проверьте логи сервера на Render:
   - Откройте ваш сервис на Render
   - Перейдите на вкладку "Logs"
   - Найдите ошибки

---

## Шаг 7: Публикация

1. В настройках VK приложения заполните:
   - Описание игры
   - Скриншоты (минимум 3 штуки)
   - Иконку приложения (200x200px)
   - Категорию и теги
2. Отправьте на модерацию (кнопка "Отправить на проверку")
3. Дождитесь одобрения (обычно 1-3 дня)

После одобрения игра станет доступна всем пользователям ВКонтакте!

---

## Полезные ссылки

- **VK Developers**: https://vk.com/dev
- **VK Bridge документация**: https://dev.vk.com/bridge/overview
- **Firebase Console**: https://console.firebase.google.com
- **Render Dashboard**: https://dashboard.render.com
- **GitHub Pages**: https://charlotte29c33cad-dotcom.github.io/projective/

---

## Текущие URL проекта

- **Frontend (GitHub Pages)**: https://charlotte29c33cad-dotcom.github.io/projective/
- **Backend (после деплоя)**: замените в game.js после создания на Render
- **VK App**: создайте на vk.com/dev

---

## Что делать после деплоя сервера

Как только вы создадите сервер на Render и получите его URL, сообщите мне:
1. APP_ID вашего VK приложения
2. URL сервера на Render

Я обновлю конфигурацию в `game.js` и запушу изменения.
