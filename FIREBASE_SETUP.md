# Настройка Firebase для облачного хранения прогресса

## Шаг 1: Создать проект Firebase

1. Перейди на https://console.firebase.google.com/
2. Нажми "Добавить проект" (Add project)
3. Введи название проекта (например, "vk-game-project")
4. Отключи Google Analytics (не обязательно для игры)
5. Нажми "Создать проект"

## Шаг 2: Включить Realtime Database

1. В меню слева выбери **Build → Realtime Database**
2. Нажми "Создать базу данных" (Create Database)
3. Выбери локацию (например, `europe-west1`)
4. Режим безопасности: выбери **"Start in test mode"** (потом настроим правила)
5. Нажми "Включить"

## Шаг 3: Получить конфигурацию

1. Перейди в **Настройки проекта** (иконка шестеренки → Project settings)
2. Пролистай вниз до раздела "Your apps"
3. Нажми иконку `</>` (Web app)
4. Введи имя приложения (например, "vk-game-web")
5. Нажми "Register app"
6. Скопируй объект `firebaseConfig`

Пример:
\`\`\`javascript
const firebaseConfig = {
  apiKey: "AIzaSyC1234567890abcdefghijklmnopq",
  authDomain: "vk-game-project.firebaseapp.com",
  databaseURL: "https://vk-game-project-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "vk-game-project",
  storageBucket: "vk-game-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
\`\`\`

## Шаг 4: Вставить конфигурацию в game.js

1. Открой `game.js`
2. Найди строку `const firebaseConfig = {`
3. Замени весь объект на свой скопированный `firebaseConfig`

## Шаг 5: Настроить правила безопасности

1. В Firebase Console перейди в **Realtime Database → Rules**
2. Замени правила на следующие:

\`\`\`json
{
  "rules": {
    "players": {
      "$userId": {
        ".read": "auth == null || auth.uid == $userId",
        ".write": "auth == null || auth.uid == $userId"
      }
    }
  }
}
\`\`\`

3. Нажми "Publish"

**Объяснение:**
- Каждый игрок может читать и писать только свой прогресс
- `$userId` — это VK user ID игрока
- Пока auth == null (тестовый режим), доступ открыт для всех

## Шаг 6: Проверить работу

1. Открой игру в браузере
2. Открой DevTools Console
3. Должно появиться:
   - `✅ Firebase initialized`
   - `User: [Имя] ID: [VK ID]`
   - `☁️ Progress saved to cloud!` при сохранении

## Шаг 7: Посмотреть данные в Firebase

1. Перейди в **Realtime Database → Data**
2. Увидишь структуру:
\`\`\`
players/
  └─ [VK_USER_ID]/
      ├─ character: { level, exp, hp, ... }
      ├─ playerGold: 100
      ├─ boss1KillCount: 3
      └─ timestamp: 1234567890
\`\`\`

## Бесплатный лимит Firebase

- 1 ГБ хранилища
- 10 ГБ/месяц загрузок
- 100 одновременных подключений

Этого хватит на **тысячи игроков**!

## Troubleshooting

**Ошибка: "Cloud save failed: permission denied"**
→ Проверь правила безопасности (Шаг 5)

**Ошибка: "Firebase is not defined"**
→ Проверь, что Firebase SDK подключён в `index.html`

**Прогресс не синхронизируется**
→ Проверь, что `vkUserId` присваивается в консоли (есть лог `User: ... ID: ...`)

## Что дальше?

- Добавить кнопку "Синхронизировать" для ручной синхронизации
- Показывать индикатор облачного сохранения
- Добавить конфликт-резолюшн (если играют с двух устройств)
