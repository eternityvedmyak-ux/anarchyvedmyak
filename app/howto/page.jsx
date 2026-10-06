import { getConfig } from "@/lib/config";
import CopyButton from "@/components/CopyButton";
import Reveal from "@/components/Reveal";

export const dynamic = "force-dynamic";

const cfg0 = getConfig();

export const metadata = { title: `Как зайти — ${cfg0.name}` };

export default function HowtoPage() {
  const { serverIp, version, name } = getConfig();
  const steps = [
    {
      n: 1,
      title: "Добавь сервер",
      body: (
        <>
          Зайди в «Сетевую игру», нажми «Добавить сервер» и введи наш адрес —{" "}
          <strong>{serverIp}</strong>. Выбери «Наборы ресурсов: Включены» и нажми «Готово».
        </>
      ),
    },
    {
      n: 2,
      title: "Зарегистрируйся",
      body: (
        <>
          Зайди на сервер, введи капчу, а затем создай пароль командой в чате:{" "}
          <code style={{ background: "var(--card-2)", padding: "2px 6px", borderRadius: 6 }}>
            /reg твой_пароль
          </code>
          .
        </>
      ),
    },
    {
      n: 3,
      title: "Выбери режим",
      body: (
        <>
          После входа выбери единственный режим — «Анархия». Желаем приятной игры на {name}!
        </>
      ),
    },
  ];

  return (
    <section className="section">
      <div className="container">
        <Reveal>
          <span className="badge">Гайд</span>
          <h1 className="section-title grad-text" style={{ marginTop: 12 }}>
            Как зайти на {name}?
          </h1>
          <p className="section-sub">Установи Minecraft {version} и следуй трём простым шагам</p>
        </Reveal>

        <Reveal>
          <div
            className="glass"
            style={{ display: "flex", gap: 14, alignItems: "center", justifyContent: "center", flexWrap: "wrap", marginBottom: 36, padding: "14px 20px", borderRadius: 18 }}
          >
            <span style={{ fontFamily: "monospace", fontSize: 18 }}>{serverIp}</span>
            <CopyButton text={serverIp} />
          </div>
        </Reveal>

        <div className="grid grid-3">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.08}>
              <div className="card" style={{ height: "100%" }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: "50%",
                    background: "var(--grad)",
                    color: "#fff",
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 14,
                  }}
                >
                  {s.n}
                </div>
                <h3 style={{ margin: "0 0 8px", fontSize: 20 }}>{s.title}</h3>
                <div className="muted" style={{ fontSize: 14 }}>
                  {s.body}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
