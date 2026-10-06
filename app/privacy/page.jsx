import { getConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

const cfg0 = getConfig();

export const metadata = { title: `Политика конфиденциальности — ${cfg0.name}` };

export default function PrivacyPage() {
  const { name } = getConfig();
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 800 }}>
        <h1 className="section-title" style={{ textAlign: "left" }}>
          Политика конфиденциальности
        </h1>
        <p className="muted">
          Проект {name} уважает вашу приватность и собирает только минимум данных,
          необходимых для работы сервера.
        </p>
        <div className="card" style={{ marginTop: 20, lineHeight: 1.8 }}>
          <ul style={{ paddingLeft: 20, display: "grid", gap: 12 }}>
            <li>Мы храним никнейм, IP-адрес и игровую статистику для защиты от нарушений.</li>
            <li>Платежные данные обрабатываются платёжной системой, а не нами.</li>
            <li>Мы не передаём персональные данные третьим лицам без законных оснований.</li>
            <li>Вы можете запросить удаление своих данных через контакты проекта.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
