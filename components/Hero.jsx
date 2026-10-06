"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import CopyButton from "@/components/CopyButton";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function Hero({ name, tagline, serverIp, version }) {
  return (
    <section className="section" style={{ paddingTop: 70, paddingBottom: 50 }}>
      <div
        className="container"
        style={{
          maxWidth: 1100,
          display: "grid",
          gridTemplateColumns: "1.05fr 0.95fr",
          gap: 44,
          alignItems: "center",
        }}
      >
        {/* Left: text */}
        <div>
          <motion.span className="badge" variants={fadeUp} initial="hidden" animate="show" custom={0}>
            Minecraft {version}
          </motion.span>
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={1}
            style={{ fontSize: "clamp(46px, 8vw, 86px)", fontWeight: 800, lineHeight: 1.0, margin: "18px 0 12px", letterSpacing: "-1px" }}
          >
            <span className="grad-text">{name}</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={2}
            style={{ fontSize: 22, fontWeight: 700, color: "var(--accent-2)", margin: "0 0 16px" }}
          >
            {tagline}
          </motion.p>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={3}
            className="muted"
            style={{ maxWidth: 520, fontSize: 17, margin: "0 0 28px" }}
          >
            Стабильный и дружелюбный сервер в режиме Анархия. Заходи к нам и играй в компании
            сотен игроков каждый день.
          </motion.p>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={4}
            style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
          >
            <Link className="btn" href="/shop">
              Перейти в магазин
            </Link>
            <Link className="btn btn-ghost" href="/howto">
              Как зайти на сервер?
            </Link>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={5}
            className="glass"
            style={{ display: "inline-flex", alignItems: "center", gap: 14, padding: "10px 14px 10px 18px", borderRadius: 999, marginTop: 26 }}
          >
            <span style={{ fontSize: 13, color: "var(--muted)" }}>IP:</span>
            <span style={{ fontFamily: "monospace", fontSize: 17 }}>{serverIp}</span>
            <CopyButton text={serverIp} />
          </motion.div>
        </div>

        {/* Right: server card */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={2}
          style={{ position: "relative" }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: "12%",
              left: "50%",
              transform: "translateX(-50%)",
              width: "80%",
              height: "80%",
              background: "radial-gradient(circle, rgba(139,92,246,0.55), transparent 65%)",
              filter: "blur(70px)",
              animation: "floaty 7s ease-in-out infinite",
              pointerEvents: "none",
            }}
          />
          <div
            className="glass"
            style={{
              position: "relative",
              borderRadius: 24,
              padding: 28,
              border: "1px solid var(--border-strong)",
              boxShadow: "0 30px 80px rgba(99,102,241,0.25)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 22 }}>
              <img
                src="/images/logo.jpg"
                alt={name}
                style={{ width: 64, height: 64, borderRadius: 16, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}
              />
              <div>
                <div style={{ fontWeight: 800, fontSize: 22 }}>{name}</div>
                <div className="muted" style={{ fontSize: 13 }}>Minecraft сервер</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <span className="muted" style={{ fontSize: 13 }}>Статус</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 14 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: "var(--ok)",
                    boxShadow: "0 0 12px rgba(52,211,153,0.9)",
                  }}
                />
                Онлайн
              </span>
            </div>

            <div style={{ height: 1, background: "var(--border)", margin: "4px 0 16px" }} />

            <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
              <div style={{ flex: 1, background: "var(--bg-2)", borderRadius: 12, padding: "12px 14px" }}>
                <div className="muted" style={{ fontSize: 12 }}>Версия</div>
                <div style={{ fontWeight: 700 }}>{version}</div>
              </div>
              <div style={{ flex: 1, background: "var(--bg-2)", borderRadius: 12, padding: "12px 14px" }}>
                <div className="muted" style={{ fontSize: 12 }}>Режим</div>
                <div style={{ fontWeight: 700 }}>Анархия</div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "var(--bg-2)",
                borderRadius: 12,
                padding: "12px 14px",
                gap: 12,
              }}
            >
              <span style={{ fontFamily: "monospace", fontSize: 15 }}>{serverIp}</span>
              <CopyButton text={serverIp} />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
