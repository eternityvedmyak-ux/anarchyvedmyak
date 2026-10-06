import Link from "next/link";
import { getConfig } from "@/lib/config";
import Reveal from "@/components/Reveal";
import Hero from "@/components/Hero";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const { name, tagline, serverIp, version, modes } = getConfig();

  const stats = [
    { v: "1000+", l: "игроков за всё время" },
    { v: "99.9%", l: "аптайм серверов" },
    { v: "24/7", l: "поддержка" },
  ];

  const perks = [
    { t: "Честная анархия", d: "Полная свобода: гриф, PvP и выживание без ограничений." },
    { t: "Стабильность", d: "Мощные сервера и отсутствие лагов — играть комфортно." },
    { t: "Сообщество", d: "Тысячи игроков, дружелюбный чат и регулярные ивенты." },
  ];

  return (
    <>
      <Hero name={name} tagline={tagline} serverIp={serverIp} version={version} />

      {/* Stats */}
      <section className="container" style={{ paddingBottom: 20 }}>
        <div className="grid grid-3">
          {stats.map((s, i) => (
            <Reveal key={i} delay={i * 0.08}>
              <div className="card" style={{ textAlign: "center", padding: 22 }}>
                <div className="grad-text" style={{ fontSize: 34, fontWeight: 800 }}>
                  {s.v}
                </div>
                <div className="muted" style={{ fontSize: 14 }}>
                  {s.l}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Modes */}
      <section className="section">
        <div className="container">
          <Reveal>
            <h2 className="section-title">Режим игры</h2>
            <p className="section-sub">Один, но самый честный</p>
          </Reveal>
          <div className="grid grid-3">
            {modes.map((m, i) => (
              <Reveal key={m.title} delay={i * 0.08}>
                <div className="card" style={{ height: "100%" }}>
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 12,
                      background: "var(--grad)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      color: "#fff",
                      marginBottom: 14,
                    }}
                  >
                    {i + 1}
                  </div>
                  <h3 style={{ margin: "0 0 8px", fontSize: 22 }}>{m.title}</h3>
                  <p className="muted" style={{ margin: 0 }}>
                    {m.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="section">
        <div className="container">
          <Reveal>
            <h2 className="section-title">Почему {name}?</h2>
            <p className="section-sub">Сервер, на котором хочется остаться</p>
          </Reveal>
          <div className="grid grid-3">
            {perks.map((f, i) => (
              <Reveal key={f.t} delay={i * 0.08}>
                <div className="card" style={{ height: "100%" }}>
                  <h3 style={{ margin: "0 0 8px", fontSize: 20 }}>{f.t}</h3>
                  <p className="muted" style={{ margin: 0 }}>
                    {f.d}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container" style={{ paddingBottom: 80 }}>
        <Reveal>
          <div
            className="glass"
            style={{
              borderRadius: 26,
              padding: "46px 30px",
              textAlign: "center",
              background: "var(--grad-soft)",
              border: "1px solid var(--border-strong)",
            }}
          >
            <h2 className="grad-text" style={{ fontSize: 32, fontWeight: 800, margin: "0 0 10px" }}>
              Готов присоединиться?
            </h2>
            <p className="muted" style={{ margin: "0 0 24px" }}>
              Скопируй IP, заходи и начинай свою историю на {name}.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link className="btn" href="/howto">
                Инструкция по входу
              </Link>
              <Link className="btn btn-ghost" href="/shop">
                Магазин
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
