# Плагин TelegramLink (Purpur / Paper)

Минимальный плагин: при входе игрока показывает в чате ссылку на
Telegram-бота, чтобы тот привязал свой аккаунт. Вся логика привязки и
управления аккаунтом — в самом боте, плагин только «приглашает».

## Сборка
Готовый jar уже есть: `dist/TelegramLink.jar` (пересобирать не нужно).
Если сам: нужна Java 21 и `libs/`, команда:
```bash
javac -cp "libs/*" -d build/classes src/main/java/ru/eternity1/telegramlink/*.java
jar cf dist/TelegramLink.jar -C build/classes . -C src/main/resources .
```

## Установка
1. Положи `dist/TelegramLink.jar` в `plugins/`.
2. Перезапусти сервер (создастся `plugins/TelegramLink/config.yml`).
3. В `config.yml` укажи `bot_link` — ссылку на бота, напр.
   `https://t.me/ETERNITY_3_2FA_bot`.
4. `/reload` или перезапуск.

При входе игрок увидит: «Привяжи свой аккаунт к Telegram-боту: <ссылка>».

## Совместимость
Paper API 1.21.x, работает на Purpur.
