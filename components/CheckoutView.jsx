"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const methods = [
  { id: "card", name: "Банковская карта", desc: "Visa, Mastercard, МИР", icon: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <line x1="2.5" y1="10" x2="21.5" y2="10" />
    </svg>
  ) },
  { id: "sbp", name: "СБП", desc: "Оплата по QR-коду", icon: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 12a8 8 0 0 1 13-6.2M20 12a8 8 0 0 1-13 6.2" />
      <polyline points="17 4 17 8 13 8" />
      <polyline points="7 20 7 16 11 16" />
    </svg>
  ) },
  { id: "yoo", name: "ЮMoney", desc: "Кошелёк и карты", icon: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="6" width="18" height="13" rx="3" />
      <path d="M3 10h18" />
      <circle cx="17" cy="14.5" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  ) },
];

export default function CheckoutView({ order }) {
  const [paid, setPaid] = useState(order.status === "paid");
  const [payUrl, setPayUrl] = useState(null);
  const [loadingUrl, setLoadingUrl] = useState(true);
  const [method, setMethod] = useState("card");
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch(`/api/orders/${order.id}/pay`)
      .then((r) => r.json())
      .then((d) => setPayUrl(d.payUrl || null))
      .catch(() => setPayUrl(null))
      .finally(() => setLoadingUrl(false));
  }, [order.id]);

  function pay() {
    if (payUrl) {
      window.location.href = payUrl;
      return;
    }
    setErr("Платёжная система не подключена администратором. Подключите шлюз в /admin → «Платёжная система».");
  }

  return (
    <div className="container" style={{ maxWidth: 960, padding: "60px 20px 90px" }}>
      <AnimatePresence mode="wait">
        {paid ? (
          <motion.div
            key="ok"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="glass"
            style={{ padding: 44, textAlign: "center", borderRadius: 24, maxWidth: 560, margin: "0 auto" }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
              style={{
                width: 78,
                height: 78,
                margin: "0 auto 18px",
                borderRadius: "50%",
                background: "var(--grad)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 40,
                color: "#fff",
                boxShadow: "0 12px 30px rgba(255,77,141,0.4)",
              }}
            >
              ✓
            </motion.div>
            <h1 className="grad-text" style={{ fontSize: 32, fontWeight: 800, margin: "0 0 8px" }}>
              Оплата прошла!
            </h1>
            <p className="muted" style={{ margin: "0 0 6px" }}>
              Заказ <strong style={{ color: "var(--text)" }}>{order.id}</strong> успешно оплачен.
            </p>
            <p className="muted">
              Товар «{order.name}» для игрока <strong style={{ color: "var(--text)" }}>{order.nickname}</strong> будет
              выдан в ближайшее время.
            </p>
            <a href="/shop" className="btn" style={{ marginTop: 22 }}>
              Вернуться в магазин
            </a>
          </motion.div>
        ) : (
          <motion.div
            key="pay"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 style={{ fontSize: 30, fontWeight: 800, textAlign: "center", margin: "0 0 6px" }}>
              Оплата заказа
            </h1>
            <p className="muted" style={{ textAlign: "center", margin: "0 0 30px" }}>
              Проверьте детали и выберите способ оплаты
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.15fr", gap: 22, alignItems: "start" }}>
              {/* Summary */}
              <div className="glass" style={{ padding: 26, borderRadius: 22, position: "sticky", top: 90 }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 18 }}>Ваш заказ</h3>
                <div style={{ display: "grid", gap: 12, marginBottom: 18 }}>
                  <Row label="Номер" value={order.id} />
                  <Row label="Товар" value={order.name} />
                  <Row label="Никнейм" value={order.nickname} />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingTop: 16,
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  <span className="muted">Итого</span>
                  <span className="grad-text" style={{ fontSize: 28, fontWeight: 800 }}>
                    {order.price} ₽
                  </span>
                </div>
              </div>

              {/* Payment */}
              <div className="glass" style={{ padding: 26, borderRadius: 22 }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 18 }}>Способ оплаты</h3>
                <div style={{ display: "grid", gap: 12, marginBottom: 22 }}>
                  {methods.map((m) => {
                    const active = method === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setMethod(m.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          width: "100%",
                          textAlign: "left",
                          padding: "14px 16px",
                          borderRadius: 14,
                          cursor: "pointer",
                          color: "var(--text)",
                          background: active ? "var(--grad-soft)" : "var(--card-2)",
                          border: active ? "1px solid transparent" : "1px solid var(--border)",
                          boxShadow: active ? "0 0 0 2px rgba(255,77,141,0.5)" : "none",
                          transition: "all 0.18s ease",
                        }}
                      >
                        <span style={{ color: active ? "var(--accent-2)" : "var(--muted)" }}>{m.icon}</span>
                        <span style={{ flex: 1 }}>
                          <span style={{ display: "block", fontWeight: 700 }}>{m.name}</span>
                          <span className="muted" style={{ fontSize: 13 }}>{m.desc}</span>
                        </span>
                        <span
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            border: "2px solid var(--border-strong)",
                            background: active ? "var(--grad)" : "transparent",
                          }}
                        />
                      </button>
                    );
                  })}
                </div>

                {err && <p style={{ color: "var(--accent)", fontSize: 13, margin: "0 0 12px" }}>{err}</p>}

                <button className="btn" onClick={pay} disabled={loadingUrl} style={{ width: "100%", fontSize: 17, padding: "15px 26px" }}>
                  {loadingUrl ? "Загрузка..." : payUrl ? `Оплатить ${order.price} ₽` : "Оплата недоступна"}
                </button>

                <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginTop: 14 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.8">
                    <rect x="5" y="11" width="14" height="9" rx="2" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                  </svg>
                  <span className="muted" style={{ fontSize: 12 }}>
                    Защищённая оплата · данные не сохраняются
                  </span>
                </div>
                <p className="muted" style={{ fontSize: 12, textAlign: "center", marginTop: 8 }}>
                  Вы будете перенаправлены на платёжную систему. Товар выдаётся только после реальной оплаты.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
      <span className="muted" style={{ fontSize: 14 }}>
        {label}
      </span>
      <strong style={{ fontSize: 14 }}>{value}</strong>
    </div>
  );
}
