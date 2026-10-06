import { getConfig } from "@/lib/config";
import Reveal from "@/components/Reveal";
import BuyButton from "@/components/BuyButton";
import styles from "./shop.module.css";

export const dynamic = "force-dynamic";

const cfg0 = getConfig();

export const metadata = { title: `Магазин — ${cfg0.name}` };

export default function ShopPage({ searchParams }) {
  const { shop, name, email } = getConfig();
  const cur = shop.currencyName || "сапфиры";
  const paid = searchParams?.paid;

  return (
    <section className="section">
      <div className="container">
        {paid && (
          <div
            className="glass"
            style={{ maxWidth: 1100, margin: "0 auto 30px", padding: "20px 26px", borderRadius: 18, border: "1px solid var(--border-strong)", display: "flex", gap: 14, alignItems: "center" }}
          >
            <div style={{ width: 42, height: 42, borderRadius: "50%", background: "var(--grad)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 22, flexShrink: 0 }}>
              ✓
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>Спасибо за оплату!</div>
              <div className="muted" style={{ fontSize: 14 }}>
                Заказ #{paid} принят. Товар будет выдан после подтверждения платежа.
              </div>
            </div>
          </div>
        )}
        <Reveal>
          <span className="badge">Магазин</span>
          <h1 className="section-title grad-text" style={{ marginTop: 12 }}>
            Поддержи проект
          </h1>
          <p className="section-sub">
            Покупай привилегии и ключи. Оплата защищена, выдача происходит автоматически.
          </p>
        </Reveal>

        {/* Валюта */}
        <Reveal>
          <h2 className="section-title" style={{ fontSize: 24, marginTop: 30 }}>
            Валюта — {cur}
          </h2>
        </Reveal>
        <div className={styles.wrap}>
          {shop.sapphireRates.map((r, i) => (
            <Reveal key={i} delay={i * 0.06}>
              <div className={`card ${styles.card}`}>
                <h3 className={styles.name}>
                  {r.amount} {cur}
                </h3>
                <p className={styles.price}>{r.price} ₽</p>
                <BuyButton item={{ id: `sapphire-${r.amount}`, name: `${r.amount} ${cur}`, price: r.price, type: "sapphire" }} />
              </div>
            </Reveal>
          ))}
        </div>

        {/* Донаты */}
        <Reveal>
          <h2 className="section-title" style={{ fontSize: 24, marginTop: 46 }}>
            Донаты
          </h2>
        </Reveal>
        <p className="section-sub" style={{ marginTop: -28 }}>
          Привилегии (кроме HERO — навсегда)
        </p>
        <div className={styles.wrap}>
          {shop.donates.map((it, i) => (
            <Reveal key={it.id} delay={i * 0.06}>
              <div className={`card ${styles.card} ${it.id === "legend" ? styles.featured : ""}`}>
                {it.id === "legend" && <span className={styles.tag}>Популярно</span>}
                <h3 className={styles.name}>{it.name}</h3>
                <p className={styles.price}>
                  {it.price} ₽ {it.period && <span>/ {it.period}</span>}
                </p>
                {it.commands?.length > 0 && (
                  <div className={styles.meta}>
                    <span className={styles.metaDot} />
                    {it.commands.length} команды · {it.extras?.length || 0} возможностей
                  </div>
                )}
                <div style={{ flex: 1 }} />
                <BuyButton item={{ id: it.id, name: it.name, price: it.price, type: "donate", commands: it.commands, extras: it.extras }} />
              </div>
            </Reveal>
          ))}
        </div>

        {/* Кейсы и ключи */}
        <Reveal>
          <h2 className="section-title" style={{ fontSize: 24, marginTop: 46 }}>
            Кейсы и ключи
          </h2>
        </Reveal>
        <p className="section-sub" style={{ marginTop: -28 }}>
          Покупай связки ключей и открывай кейсы в игре
        </p>
        <div className={styles.wrap}>
          {shop.cases.map((it, i) => (
            <Reveal key={it.id} delay={i * 0.06}>
              <div className={`card ${styles.card}`}>
                <h3 className={styles.name}>{it.name}</h3>
                <p className={styles.price}>{it.price} ₽</p>
                <div style={{ flex: 1 }} />
                <BuyButton item={{ id: it.id, name: it.name, price: it.price, type: "case" }} />
              </div>
            </Reveal>
          ))}
        </div>

        <p className="muted" style={{ textAlign: "center", marginTop: 30 }}>
          По вопросам покупки пиши нам на{" "}
          <a href={`mailto:${email}`} style={{ color: "var(--accent-2)" }}>
            {email}
          </a>{" "}
          или подключайся на {cfg0.serverIp}.
        </p>
      </div>
    </section>
  );
}
