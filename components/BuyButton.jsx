"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

const methods = [
  { id: "card", name: "Банковская карта", desc: "Visa, Mastercard, МИР", icon: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <line x1="2.5" y1="10" x2="21.5" y2="10" />
    </svg>
  ) },
  { id: "sbp", name: "СБП", desc: "Оплата по QR-коду", icon: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 12a8 8 0 0 1 13-6.2M20 12a8 8 0 0 1-13 6.2" />
      <polyline points="17 4 17 8 13 8" />
      <polyline points="7 20 7 16 11 16" />
    </svg>
  ) },
  { id: "yoo", name: "ЮMoney", desc: "Кошелёк и карты", icon: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="6" width="18" height="13" rx="3" />
      <path d="M3 10h18" />
      <circle cx="17" cy="14.5" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  ) },
];

export default function BuyButton({ item, label = "Купить" }) {
  const [open, setOpen] = useState(false);
  const [nick, setNick] = useState("");
  const [method, setMethod] = useState("card");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const [orderId, setOrderId] = useState("");

  const hasInfo = (item.commands && item.commands.length) || (item.extras && item.extras.length);

  async function pay() {
    if (!nick.trim()) {
      setErr("Введите никнейм в Minecraft");
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: item.id,
          itemType: item.type,
          name: item.name,
          price: item.price,
          nickname: nick.trim(),
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErr(data.error || "Ошибка оформления");
        setLoading(false);
        return;
      }
      setOrderId(data.order.id);
      const payUrl = data.payUrl;
      // Если провайдер настроен — уходим на платёжную систему (реальная оплата).
      if (payUrl && payUrl.startsWith("http")) {
        window.location.href = payUrl;
        return;
      }
      // Платёжка не подключена: товар НЕ выдаём бесплатно.
      setErr("Платёжная система не подключена администратором. Оплата невозможна — свяжитесь с администратором сервера.");
    } catch {
      setErr("Сетевая ошибка, попробуйте ещё раз");
    } finally {
      setLoading(false);
    }
  }

  function close() {
    setOpen(false);
    setTimeout(() => {
      setNick("");
      setMethod("card");
      setErr("");
      setDone(false);
      setOrderId("");
    }, 250);
  }

  return (
    <>
      <button className="btn" style={{ width: "100%", justifyContent: "center" }} onClick={() => setOpen(true)}>
        {label}
      </button>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 100,
              background: "rgba(3,3,8,0.72)",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 18,
              overflowY: "auto",
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="glass"
              style={{ width: "100%", maxWidth: 880, borderRadius: 24, overflow: "hidden", position: "relative" }}
            >
              {/* Top accent */}
              <div style={{ height: 5, background: "var(--grad)" }} />

              <button
                onClick={close}
                aria-label="Закрыть"
                style={{ position: "absolute", top: 16, right: 16, width: 34, height: 34, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--card-2)", color: "var(--muted)", cursor: "pointer", fontSize: 18 }}
              >
                ✕
              </button>

              <AnimatePresence mode="wait">
                {done ? (
                  <motion.div
                    key="ok"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{ padding: "52px 30px", textAlign: "center" }}
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
                      style={{
                        width: 74, height: 74, margin: "0 auto 16px", borderRadius: "50%",
                        background: "var(--grad)", display: "flex", alignItems: "center",
                        justifyContent: "center", fontSize: 38, color: "#fff",
                      }}
                    >
                      ✓
                    </motion.div>
                    <h2 className="grad-text" style={{ fontSize: 28, fontWeight: 800, margin: "0 0 8px" }}>
                      Оплата прошла!
                    </h2>
                    <p className="muted" style={{ margin: "0 0 4px" }}>
                      Заказ <strong style={{ color: "var(--text)" }}>{orderId}</strong> оплачен.
                    </p>
                    <p className="muted">
                      Товар «{item.name}» для <strong style={{ color: "var(--text)" }}>{nick}</strong> будет выдан в ближайшее время.
                    </p>
                    <button className="btn" onClick={close} style={{ marginTop: 20 }}>
                      Готово
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="pay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{ display: "grid", gridTemplateColumns: hasInfo ? "1fr 1.05fr" : "1fr", gap: 0 }}
                  >
                    {/* Payment */}
                    <div style={{ padding: 30 }}>
                      <h3 style={{ margin: "0 0 4px", fontSize: 22 }}>{item.name}</h3>
                      <p className="muted" style={{ margin: "0 0 18px", fontSize: 14 }}>
                        Сумма: <strong style={{ color: "var(--accent-2)" }}>{item.price} ₽</strong>
                        {item.period ? ` / ${item.period}` : ""}
                      </p>

                      <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>
                        Ваш никнейм в Minecraft
                      </label>
                      <input
                        autoFocus
                        value={nick}
                        onChange={(e) => setNick(e.target.value)}
                        placeholder="Steve"
                        style={{
                          width: "100%", padding: "12px 14px", borderRadius: 12,
                          border: "1px solid var(--border-strong)", background: "var(--bg-2)",
                          color: "var(--text)", fontSize: 15, marginBottom: 18,
                        }}
                      />

                      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 10 }}>Способ оплаты</div>
                      <div style={{ display: "grid", gap: 10, marginBottom: 18 }}>
                        {methods.map((m) => {
                          const active = method === m.id;
                          return (
                            <button
                              key={m.id}
                              onClick={() => setMethod(m.id)}
                              style={{
                                display: "flex", alignItems: "center", gap: 12, width: "100%",
                                textAlign: "left", padding: "12px 14px", borderRadius: 12, cursor: "pointer",
                                color: "var(--text)",
                                background: active ? "var(--grad-soft)" : "var(--card-2)",
                                border: active ? "1px solid transparent" : "1px solid var(--border)",
                                boxShadow: active ? "0 0 0 2px rgba(255,77,141,0.5)" : "none",
                                transition: "all 0.18s ease",
                              }}
                            >
                              <span style={{ color: active ? "var(--accent-2)" : "var(--muted)" }}>{m.icon}</span>
                              <span style={{ flex: 1 }}>
                                <span style={{ display: "block", fontWeight: 700, fontSize: 14 }}>{m.name}</span>
                                <span className="muted" style={{ fontSize: 12 }}>{m.desc}</span>
                              </span>
                              <span style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid var(--border-strong)", background: active ? "var(--grad)" : "transparent" }} />
                            </button>
                          );
                        })}
                      </div>

                      {err && <p style={{ color: "var(--accent)", fontSize: 13, margin: "0 0 12px" }}>{err}</p>}

                      <button className="btn" onClick={pay} disabled={loading} style={{ width: "100%", fontSize: 16, padding: "14px 22px" }}>
                        {loading ? "Обработка..." : `Оплатить ${item.price} ₽`}
                      </button>

                      <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginTop: 12 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.8">
                          <rect x="5" y="11" width="14" height="9" rx="2" />
                          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                        </svg>
                        <span className="muted" style={{ fontSize: 11 }}>Защищённая оплата · данные не сохраняются</span>
                      </div>
                    </div>

                    {/* Info: commands + extras */}
                    {hasInfo && (
                      <div style={{ padding: 30, background: "rgba(255,255,255,0.02)", borderLeft: "1px solid var(--border)" }}>
                        {item.commands && item.commands.length > 0 && (
                          <div style={{ marginBottom: 22 }}>
                            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, color: "var(--accent-2)", textTransform: "uppercase", marginBottom: 10 }}>
                              Команды
                            </div>
                            <div style={{ display: "grid", gap: 8 }}>
                              {item.commands.map((c, i) => (
                                <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14 }}>
                                  <span style={{ color: "var(--violet)" }}>❯</span>
                                  <code style={{ fontFamily: "monospace", color: "var(--text)", fontSize: 13.5 }}>{c}</code>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {item.extras && item.extras.length > 0 && (
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, color: "var(--accent-2)", textTransform: "uppercase", marginBottom: 10 }}>
                              Доп. возможности
                            </div>
                            <div style={{ display: "grid", gap: 8 }}>
                              {item.extras.map((e, i) => (
                                <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14 }}>
                                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--grad)" }} />
                                  <span className="muted">{e}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
          )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
