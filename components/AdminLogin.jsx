"use client";

import { useState } from "react";

export default function AdminLogin() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });
      const data = await res.json();
      if (data.ok) {
        window.location.href = "/admin";
      } else {
        setErr(data.error || "Ошибка входа");
        setLoading(false);
      }
    } catch {
      setErr("Ошибка сети");
      setLoading(false);
    }
  }

  return (
    <div className="container section" style={{ display: "flex", justifyContent: "center", minHeight: "70vh", alignItems: "center" }}>
      <form onSubmit={submit} className="glass" style={{ width: "100%", maxWidth: 380, padding: 32, borderRadius: 24, border: "1px solid var(--border-strong)" }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 6px", textAlign: "center" }}>Вход в админ-панель</h1>
        <p className="muted" style={{ textAlign: "center", marginTop: 0, marginBottom: 24, fontSize: 14 }}>
          Введите логин и пароль для доступа
        </p>

        <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>Логин</label>
        <input
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          autoFocus
          style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg-2)", color: "var(--text)", fontSize: 15, marginBottom: 16 }}
        />

        <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>Пароль</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg-2)", color: "var(--text)", fontSize: 15, marginBottom: 18 }}
        />

        {err && <p style={{ color: "var(--accent)", fontSize: 13, margin: "0 0 12px", textAlign: "center" }}>{err}</p>}

        <button className="btn" style={{ width: "100%" }} disabled={loading}>
          {loading ? "Проверяем..." : "Войти"}
        </button>
      </form>
    </div>
  );
}
