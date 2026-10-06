"use strict";

const rcon = require("rcon-client");

let client = null;

// Ленивое подключение к RCON. Возвращает null, если RCON не настроен.
async function getClient() {
  if (!process.env.RCON_HOST || !process.env.RCON_PASSWORD) return null;
  if (client && client.socket && !client.socket.destroyed) return client;
  client = await rcon.Rcon.connect({
    host: process.env.RCON_HOST,
    port: parseInt(process.env.RCON_PORT || "25575", 10),
    password: process.env.RCON_PASSWORD,
  });
  return client;
}

// Отправить команду на сервер. Возвращает ответ или null, если RCON не настроен.
async function send(cmd) {
  const cli = await getClient();
  if (!cli) return null;
  return await cli.send(cmd);
}

module.exports = { send };
