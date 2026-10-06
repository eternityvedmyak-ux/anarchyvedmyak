"use strict";

const fs = require("fs");
const path = require("path");

const f = path.join(__dirname, "..", "data", "botlinks.json");

function load() {
  try {
    let raw = fs.readFileSync(f, "utf8");
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
    return JSON.parse(raw);
  } catch (e) {
    return { chats: {} };
  }
}

function save(db) {
  try {
    fs.mkdirSync(path.dirname(f), { recursive: true });
  } catch (e) {}
  fs.writeFileSync(f, JSON.stringify(db, null, 2));
}

function getChat(id) {
  return load().chats[String(id)] || null;
}

function upsertChat(id, data) {
  const db = load();
  const cur = db.chats[String(id)] || {};
  db.chats[String(id)] = Object.assign(cur, data);
  save(db);
  return db.chats[String(id)];
}

// Добавить/обновить привязанный аккаунт (храним только хэш пароля).
function addAccount(id, nick, passHash) {
  const db = load();
  const c = db.chats[String(id)] || { accounts: [] };
  c.accounts = c.accounts || [];
  const ex = c.accounts.find((a) => a.nick.toLowerCase() === nick.toLowerCase());
  if (ex) {
    ex.passHash = passHash;
    ex.linkedAt = Date.now();
  } else {
    c.accounts.push({ nick, passHash, linkedAt: Date.now() });
  }
  db.chats[String(id)] = c;
  save(db);
}

function getAccounts(id) {
  const c = getChat(id);
  return c && c.accounts ? c.accounts : [];
}

function hasAccount(id, nick) {
  return getAccounts(id).some((a) => a.nick.toLowerCase() === nick.toLowerCase());
}

function removeAccount(id, nick) {
  const db = load();
  const c = db.chats[String(id)];
  if (!c || !c.accounts) return;
  c.accounts = c.accounts.filter((a) => a.nick.toLowerCase() !== nick.toLowerCase());
  db.chats[String(id)] = c;
  save(db);
}

module.exports = { getChat, upsertChat, addAccount, getAccounts, hasAccount, removeAccount, load };
