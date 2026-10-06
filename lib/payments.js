import crypto from "crypto";
import { getConfig } from "./config";

function md5hex(s) {
  return crypto.createHash("md5").update(s, "utf8").digest("hex");
}

// Строит URL для оплаты заказа.
// provider "demo" — имитируется локально (возвращает /checkout/[id]).
// provider "lava"  — редирект на платёжную форму Lava (https://pay.lava.ru).
//
// Подпись формы Lava: md5(shopId + amount + orderId + secretKey) — без разделителей.
// Точную формулу подписи/уведомления см. в документации твоего провайдера
// (файл lib/payments.js — единственное место, где меняется алгоритм).
export function buildPayUrl(order) {
  const payment = getConfig().payment || { provider: "demo" };
  const base = process.env.NEXT_PUBLIC_SITE_URL || "";

  if (payment.provider === "lava" && payment.merchantId) {
    const shopId = payment.merchantId;
    const amount = String(order.price);
    const orderId = order.id;
    const comment = `Eternity-1: ${order.name} @${order.nickname}`;
    const successUrl = base + "/shop?paid=" + order.id;
    const failUrl = base + "/shop";
    const signature = md5hex(shopId + amount + orderId + (payment.apiKey || ""));

    const u = new URL("https://pay.lava.ru/");
    u.searchParams.set("shopId", shopId);
    u.searchParams.set("amount", amount);
    u.searchParams.set("orderId", orderId);
    u.searchParams.set("comment", comment);
    u.searchParams.set("successUrl", successUrl);
    u.searchParams.set("failUrl", failUrl);
    u.searchParams.set("signature", signature);
    return u.toString();
  }

  return `/checkout/${order.id}`;
}

// Проверка уведомления (webhook) от Lava.
// Подпись уведомления: md5(orderId + status + type + secretKey).
export function verifyLavaNotification(body, payment) {
  const key = payment.apiKey || "";
  const expected = md5hex((body.orderId || "") + (body.status || "") + (body.type || "") + key);
  return expected === (body.signature || "");
}
