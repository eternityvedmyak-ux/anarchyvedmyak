"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminEditor() {
  const [cfg, setCfg] = useState(null);
  const [status, setStatus] = useState("");
  const [orders, setOrders] = useState(null);
  const [ordersMsg, setOrdersMsg] = useState("");

  async function loadOrders() {
    try {
      const r = await fetch("/api/orders");
      const d = await r.json();
      setOrders(Array.isArray(d) ? d : []);
    } catch {
      setOrders([]);
    }
  }
  useEffect(() => {
    loadOrders();
  }, []);

  async function confirmOrder(id) {
    setOrdersMsg("");
    const r = await fetch(`/api/orders/${id}`, { method: "POST" });
    const d = await r.json();
    if (d.ok) loadOrders();
    else setOrdersMsg(d.error || "Ошибка");
  }

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then(setCfg)
      .catch(() => setStatus("Не удалось загрузить конфиг"));
  }, []);

  function update(mutator) {
    setCfg((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      mutator(next);
      return next;
    });
  }

  async function save() {
    setStatus("Сохраняем...");
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      });
      const data = await res.json();
      setStatus(data.ok ? "Сохранено! ✅" : "Ошибка: " + data.error);
    } catch (e) {
      setStatus("Ошибка сети: " + e);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin";
  }

  if (!cfg) {
    return (
      <div className="container section">
        <p className="muted">Загрузка админ-панели...</p>
      </div>
    );
  }

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid var(--border)",
    background: "var(--bg-2)",
    color: "var(--text)",
    fontSize: 14,
    marginBottom: 4,
  };
  const labelStyle = { display: "block", fontSize: 13, color: "var(--muted)", margin: "14px 0 4px" };
  const groupStyle = { marginBottom: 26 };
  const wh = typeof window !== "undefined" ? window.location.origin + "/api/payments/webhook" : "";

  return (
    <div className="container" style={{ maxWidth: 860, padding: "40px 20px 80px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, margin: 0 }}>Админ-панель</h1>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/" className="btn btn-ghost">
            ← На сайт
          </Link>
          <button className="btn btn-ghost" onClick={logout}>
            Выйти
          </button>
        </div>
      </div>
      <p className="muted" style={{ marginTop: 0 }}>
        Меняй контент сайта и сохраняй. Изменения сразу применяются на всех страницах.
      </p>

      {/* Основное */}
      <div className="card" style={groupStyle}>
        <h3 style={{ marginTop: 0 }}>Основное</h3>
        <label style={labelStyle}>Название сервера</label>
        <input style={inputStyle} value={cfg.name} onChange={(e) => update((c) => (c.name = e.target.value))} />
        <label style={labelStyle}>Слоган</label>
        <input style={inputStyle} value={cfg.tagline} onChange={(e) => update((c) => (c.tagline = e.target.value))} />
        <label style={labelStyle}>IP сервера</label>
        <input style={inputStyle} value={cfg.serverIp} onChange={(e) => update((c) => (c.serverIp = e.target.value))} />
        <label style={labelStyle}>Версия Minecraft</label>
        <input style={inputStyle} value={cfg.version} onChange={(e) => update((c) => (c.version = e.target.value))} />
        <label style={labelStyle}>Почта</label>
        <input style={inputStyle} value={cfg.email} onChange={(e) => update((c) => (c.email = e.target.value))} />
      </div>

      {/* Соцсети */}
      <div className="card" style={groupStyle}>
        <h3 style={{ marginTop: 0 }}>Ссылки на соцсети</h3>
        {["telegram", "vk", "discord"].map((k) => (
          <div key={k}>
            <label style={labelStyle}>{k}</label>
            <input style={inputStyle} value={cfg.social[k]} onChange={(e) => update((c) => (c.social[k] = e.target.value))} />
          </div>
        ))}
      </div>

      {/* Юр. данные */}
      <div className="card" style={groupStyle}>
        <h3 style={{ marginTop: 0 }}>Юридические данные (футер)</h3>
        {["owner", "inn", "ogrnip", "city", "email"].map((k) => (
          <div key={k}>
            <label style={labelStyle}>{k}</label>
            <input style={inputStyle} value={cfg.legal[k]} onChange={(e) => update((c) => (c.legal[k] = e.target.value))} />
          </div>
        ))}
      </div>

      {/* Режимы */}
      <div className="card" style={groupStyle}>
        <h3 style={{ marginTop: 0 }}>Режимы игры</h3>
        {cfg.modes.map((m, i) => (
          <div key={i} style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 12 }}>
            <label style={labelStyle}>Название</label>
            <input style={inputStyle} value={m.title} onChange={(e) => update((c) => (c.modes[i].title = e.target.value))} />
            <label style={labelStyle}>Описание</label>
            <input style={inputStyle} value={m.description} onChange={(e) => update((c) => (c.modes[i].description = e.target.value))} />
            <button className="btn btn-ghost" style={{ marginTop: 8 }} onClick={() => update((c) => c.modes.splice(i, 1))}>
              Удалить режим
            </button>
          </div>
        ))}
        <button className="btn btn-ghost" style={{ marginTop: 14 }} onClick={() => update((c) => c.modes.push({ title: "", description: "" }))}>
          + Добавить режим
        </button>
      </div>

      {/* Платежная система */}
      <div className="card" style={groupStyle}>
        <h3 style={{ marginTop: 0 }}>Платёжная система</h3>
        <label style={labelStyle}>Провайдер</label>
        <select
          style={inputStyle}
          value={cfg.payment.provider}
          onChange={(e) => update((c) => (c.payment.provider = e.target.value))}
        >
          <option value="demo">demo (имитация оплаты)</option>
          <option value="lava">Lava</option>
        </select>
        <label style={labelStyle}>Merchant ID (shopId)</label>
        <input
          style={inputStyle}
          value={cfg.payment.merchantId || ""}
          onChange={(e) => update((c) => (c.payment.merchantId = e.target.value))}
        />
        <label style={labelStyle}>Секретный ключ (apiKey)</label>
        <input
          type="password"
          style={inputStyle}
          value={cfg.payment.apiKey || ""}
          onChange={(e) => update((c) => (c.payment.apiKey = e.target.value))}
        />
        <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>
          Webhook-URL для Lava (вставь в личном кабинете): <code>{wh}</code>
        </p>
      </div>

      {/* Магазин */}
      <div className="card" style={groupStyle}>
        <h3 style={{ marginTop: 0 }}>Магазин</h3>

        <h4 style={{ margin: "16px 0 4px" }}>Валюта</h4>
        <label style={labelStyle}>Название валюты (например, сапфиры)</label>
        <input style={inputStyle} value={cfg.shop.currencyName} onChange={(e) => update((c) => (c.shop.currencyName = e.target.value))} />

        <h4 style={{ margin: "18px 0 4px" }}>Паки валюты</h4>
        {cfg.shop.sapphireRates.map((r, i) => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-end", borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Количество</label>
              <input style={inputStyle} type="number" value={r.amount} onChange={(e) => update((c) => (c.shop.sapphireRates[i].amount = Number(e.target.value)))} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Цена (₽)</label>
              <input style={inputStyle} type="number" value={r.price} onChange={(e) => update((c) => (c.shop.sapphireRates[i].price = Number(e.target.value)))} />
            </div>
            <button className="btn btn-ghost" style={{ marginBottom: 4 }} onClick={() => update((c) => c.shop.sapphireRates.splice(i, 1))}>
              ✕
            </button>
          </div>
        ))}
        <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => update((c) => c.shop.sapphireRates.push({ amount: 0, price: 0 }))}>
          + Добавить пак
        </button>

        <h4 style={{ margin: "22px 0 4px" }}>Донаты (привилегии)</h4>
        {cfg.shop.donates.map((it, i) => (
          <div key={i} style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 12 }}>
            <label style={labelStyle}>Название</label>
            <input style={inputStyle} value={it.name} onChange={(e) => update((c) => (c.shop.donates[i].name = e.target.value))} />
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Цена (₽)</label>
                <input style={inputStyle} type="number" value={it.price} onChange={(e) => update((c) => (c.shop.donates[i].price = Number(e.target.value)))} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Срок (напр. 1 месяц)</label>
                <input style={inputStyle} value={it.period || ""} onChange={(e) => update((c) => (c.shop.donates[i].period = e.target.value))} />
              </div>
            </div>
            <label style={labelStyle}>Команды (каждое с новой строки)</label>
            <textarea
              style={{ ...inputStyle, minHeight: 64, resize: "vertical" }}
              value={(it.commands || []).join("\n")}
              onChange={(e) => update((c) => (c.shop.donates[i].commands = e.target.value.split("\n").filter(Boolean)))}
            />
            <label style={labelStyle}>Доп. возможности (каждое с новой строки)</label>
            <textarea
              style={{ ...inputStyle, minHeight: 64, resize: "vertical" }}
              value={(it.extras || []).join("\n")}
              onChange={(e) => update((c) => (c.shop.donates[i].extras = e.target.value.split("\n").filter(Boolean)))}
            />
            <button className="btn btn-ghost" style={{ marginTop: 6 }} onClick={() => update((c) => c.shop.donates.splice(i, 1))}>
              Удалить
            </button>
          </div>
        ))}
        <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => update((c) => c.shop.donates.push({ id: "don" + Date.now(), name: "", price: 0, period: "", features: [] }))}>
          + Добавить донат
        </button>

        <h4 style={{ margin: "22px 0 4px" }}>Кейсы и ключи</h4>
        {cfg.shop.cases.map((it, i) => (
          <div key={i} style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 12 }}>
            <label style={labelStyle}>Название</label>
            <input style={inputStyle} value={it.name} onChange={(e) => update((c) => (c.shop.cases[i].name = e.target.value))} />
            <label style={labelStyle}>Цена (₽, 0 — открывается ключами)</label>
            <input style={inputStyle} type="number" value={it.price} onChange={(e) => update((c) => (c.shop.cases[i].price = Number(e.target.value)))} />
            <label style={labelStyle}>Описание (каждое с новой строки)</label>
            <textarea
              style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
              value={it.features.join("\n")}
              onChange={(e) => update((c) => (c.shop.cases[i].features = e.target.value.split("\n")))}
            />
            <button className="btn btn-ghost" style={{ marginTop: 6 }} onClick={() => update((c) => c.shop.cases.splice(i, 1))}>
              Удалить
            </button>
          </div>
        ))}
        <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => update((c) => c.shop.cases.push({ id: "case" + Date.now(), name: "", price: 0, features: [] }))}>
          + Добавить кейс/ключ
        </button>
      </div>

      {/* Заказы */}
      <div className="card" style={groupStyle}>
        <h3 style={{ marginTop: 0 }}>Заказы (последние)</h3>
        {!orders && <p className="muted">Загрузка...</p>}
        {orders && orders.length === 0 && <p className="muted">Заказов пока нет.</p>}
        {orders &&
          orders.map((o) => (
            <div
              key={o.id}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderTop: "1px solid var(--border)", padding: "10px 0" }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>{o.name} · {o.price} ₽</div>
                <div className="muted" style={{ fontSize: 13 }}>
                  @{o.nickname} · {o.id} · {new Date(o.createdAt).toLocaleString()}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: o.status === "paid" ? "var(--ok)" : "var(--accent)" }}>
                  {o.status === "paid" ? "Оплачен" : "Ожидает"}
                </span>
                {o.status !== "paid" && (
                  <button className="btn btn-ghost" style={{ padding: "8px 14px" }} onClick={() => confirmOrder(o.id)}>
                    Подтвердить
                  </button>
                )}
              </div>
            </div>
          ))}
        {ordersMsg && <p style={{ color: "var(--accent)", fontSize: 13, marginBottom: 0 }}>{ordersMsg}</p>}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 10 }}>
        <button className="btn" onClick={save}>
          Сохранить изменения
        </button>
        <span style={{ color: status.includes("Ошибка") ? "var(--accent)" : "var(--ok)" }}>{status}</span>
      </div>
    </div>
  );
}
