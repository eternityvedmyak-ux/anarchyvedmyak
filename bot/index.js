"use strict";

// ---- минимальный загрузчик .env (без зависимостей) ----
(function loadEnv() {
  const fs = require("fs");
  const path = require("path");
  const f = path.join(__dirname, ".env");
  if (!fs.existsSync(f)) return;
  for (const line of fs.readFileSync(f, "utf8").split("\n")) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
})();

const crypto = require("crypto");
const TelegramBot = require("node-telegram-bot-api");
const store = require("./store");
const rcon = require("./rcon");

const TOKEN = process.env.BOT_TOKEN;
const OWNER = process.env.OWNER_TELEGRAM_ID;

if (!TOKEN) {
  console.error("BOT_TOKEN не задан. Укажи его в .env и перезапусти.");
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });

// Не падаем молча при ошибках в асинхронных обработчиках.
process.on("unhandledRejection", (e) => console.error("unhandledRejection:", e));
process.on("uncaughtException", (e) => console.error("uncaughtException:", e));

function sha256(s) {
  return crypto.createHash("sha256").update(String(s)).digest("hex");
}

// Подставляет <nick> и <pass> в шаблон RCON-команды.
function fillTpl(tpl, nick, pass) {
  return String(tpl).replace(/<nick>/g, nick).replace(/<pass>/g, pass || "");
}

function rconReady() {
  return !!(process.env.RCON_HOST && process.env.RCON_PASSWORD);
}

// ===== /start =====
bot.onText(/^\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "Для того, чтобы привязать игровой аккаунт, выполните следующие действия:\n" +
      "1. Напишите (сюда): /bind [Ваш-Ник] [Ваш-Пароль] (Поддержка Ваш пароль не увидит)\n" +
      "2. Напишите /help (сюда), чтобы увидеть возможности.\n\n" +
      "Приятной игры на наших серверах!"
  );
});

// ===== /help =====
bot.onText(/^\/help/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "Список команд:\n\n" +
      "- /bind [НИК] [ПАРОЛЬ] — Привязать аккаунт к текущей странице\n" +
      "- /list — Список привязанных аккаунтов\n" +
      "- /recovery [НИК] — Сбросить пароль от аккаунта\n" +
      "- /license [НИК] — Включить/отключить режим лицензии\n" +
      "  *Внимание! После включения лицензии на сервер можно будет зайти только используя лицензионный аккаунт Mojang.\n" +
      "- /2fa [НИК] — включить/отключить подтверждение входа через ВК/ТГ\n" +
      "- /kick [НИК] — кикнуть аккаунт с сервера"
  );
});

// ===== /bind [НИК] [ПАРОЛЬ] =====
bot.onText(/^\/bind\s+(\S+)\s+(\S+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const nick = match[1].trim();
  const pass = match[2];

  if (nick.length < 3 || nick.length > 16) {
    return bot.sendMessage(chatId, "❌ Ник должен быть от 3 до 16 символов.");
  }
  if (pass.length < 4) {
    return bot.sendMessage(chatId, "❌ Пароль слишком короткий (минимум 4 символа).");
  }

  const passHash = sha256(pass);
  store.addAccount(chatId, nick, passHash);

  // Опционально: применить пароль на сервере (шаблон RCON_BIND).
  let note = "";
  if (rconReady() && process.env.RCON_BIND) {
    try {
      await rcon.send(fillTpl(process.env.RCON_BIND, nick, pass));
      note = "\n✅ Пароль применён на сервере.";
    } catch (e) {
      console.warn("bind RCON error:", e.message);
      note = "\n⚠️ Не удалось применить пароль на сервере (проверь RCON_BIND).";
    }
  } else if (!rconReady()) {
    note = "\nℹ️ RCON не настроен — привязка сохранена локально, но не проверена на сервере.";
  }

  bot.sendMessage(
    chatId,
    `✅ Аккаунт *${nick}* привязан к этому Telegram.${note}`,
    { parse_mode: "Markdown" }
  );
});

// ===== /list =====
bot.onText(/^\/list/, (msg) => {
  const accs = store.getAccounts(msg.chat.id);
  if (!accs.length) {
    return bot.sendMessage(msg.chat.id, "У тебя пока нет привязанных аккаунтов. Используй /bind [НИК] [ПАРОЛЬ].");
  }
  const text = "Привязанные аккаунты:\n" + accs.map((a) => `• ${a.nick}`).join("\n");
  bot.sendMessage(msg.chat.id, text);
});

// Универсальный обработчик команд, требующих RCON + привязанный ник.
async function accountAction(msg, nick, tplEnv, okText, needPass) {
  const chatId = msg.chat.id;
  if (!store.hasAccount(chatId, nick)) {
    return bot.sendMessage(chatId, `❌ Аккаунт *${nick}* не привязан к тебе. Сначала /bind.`, { parse_mode: "Markdown" });
  }
  if (!rconReady()) {
    return bot.sendMessage(chatId, "🔒 Сервер не настроен (RCON выключен). Обратись к админу.");
  }
  const tpl = process.env[tplEnv];
  if (!tpl) {
    return bot.sendMessage(chatId, `🔒 Команда не настроена админом (${tplEnv} в .env).`);
  }
  const pass = needPass ? genPass() : "";
  try {
    await rcon.send(fillTpl(tpl, nick, pass));
    if (needPass) {
      bot.sendMessage(chatId, `🔑 ${okText} *${nick}*:\n\`${pass}\`\nНикому не показывай!`, { parse_mode: "Markdown" });
    } else {
      bot.sendMessage(chatId, `✅ ${okText} *${nick}*.`, { parse_mode: "Markdown" });
    }
  } catch (e) {
    console.warn(tplEnv + " error:", e.message);
    bot.sendMessage(chatId, "⚠️ Не удалось выполнить команду. Попробуй позже или напиши админу.");
  }
}

function genPass() {
  const a = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}

// ===== /recovery [НИК] =====
bot.onText(/^\/recovery\s+(\S+)/, (msg, match) => {
  accountAction(msg, match[1].trim(), "RCON_RECOVERY", "Новый пароль для", true);
});

// ===== /license [НИК] =====
bot.onText(/^\/license\s+(\S+)/, (msg, match) => {
  accountAction(msg, match[1].trim(), "RCON_LICENSE", "Режим лицензии переключён для", false);
});

// ===== /2fa [НИК] =====
bot.onText(/^\/2fa\s+(\S+)/, (msg, match) => {
  accountAction(msg, match[1].trim(), "RCON_2FA", "2FA переключён для", false);
});

// ===== /kick [НИК] =====
bot.onText(/^\/kick\s+(\S+)/, (msg, match) => {
  accountAction(msg, match[1].trim(), "RCON_KICK", "Аккаунт кикнут", false);
});

// ===== /accounts (только владелец) — все привязанные аккаунты =====
bot.onText(/^\/accounts/, (msg) => {
  if (String(msg.chat.id) !== String(OWNER)) return;
  const db = store.load();
  const rows = [];
  for (const [cid, c] of Object.entries(db.chats || {})) {
    for (const a of c.accounts || []) rows.push(`• ${a.nick}  →  chat ${cid}`);
  }
  bot.sendMessage(
    msg.chat.id,
    rows.length ? "Все привязанные аккаунты:\n" + rows.join("\n") : "Привязок пока нет."
  );
});

console.log("Telegram-бот Eternity-1 (привязка аккаунтов) запущен (polling)...");
