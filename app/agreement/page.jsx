import { getConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

const cfg0 = getConfig();

export const metadata = { title: `Соглашение — ${cfg0.name}` };

export default function AgreementPage() {
  const { name, legal } = getConfig();
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 800 }}>
        <h1 className="section-title" style={{ textAlign: "left" }}>
          Пользовательское соглашение
        </h1>
        <p className="muted">
          Настоящее соглашение регулирует отношения между проектом {name} ({legal.owner},
          ИНН {legal.inn}) и пользователем сервера.
        </p>
        <div className="card" style={{ marginTop: 20, lineHeight: 1.8 }}>
          <ol style={{ paddingLeft: 20, display: "grid", gap: 12 }}>
            <li>Используя сервер, вы принимаете правила и условия проекта.</li>
            <li>Администрация вправе изменять правила и функционал без уведомления.</li>
            <li>Покупки в магазине являются добровольным пожертвованием на развитие.</li>
            <li>Мы не несём ответственности за временные технические неполадки.</li>
            <li>Все средства направляются исключительно на развитие проекта {name}.</li>
          </ol>
        </div>
      </div>
    </section>
  );
}
