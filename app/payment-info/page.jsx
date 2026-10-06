import { getConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

const cfg0 = getConfig();

export const metadata = { title: `Правила оплаты — ${cfg0.name}` };

export default function PaymentInfoPage() {
  const { name } = getConfig();
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 800 }}>
        <h1 className="section-title" style={{ textAlign: "left" }}>
          Правила оплаты
        </h1>
        <p className="muted">
          Покупая привилегии и товары на {name}, вы соглашаетесь со следующими условиями.
        </p>
        <div className="card" style={{ marginTop: 20, lineHeight: 1.8 }}>
          <ul style={{ paddingLeft: 20, display: "grid", gap: 12 }}>
            <li>Оплата производится через защищённые платёжные шлюзы (карты, МИР, e-wallets).</li>
            <li>Выдача товаров происходит автоматически после подтверждения оплаты.</li>
            <li>Возврат средств возможен только до момента выдачи товара на аккаунт.</li>
            <li>При ошибке оплаты обратитесь в поддержку с чеком транзакции.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
