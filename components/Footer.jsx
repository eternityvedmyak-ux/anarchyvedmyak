import Link from "next/link";
import styles from "./Footer.module.css";

function Visa() {
  return (
    <svg className={styles.pay} viewBox="0 0 48 30" role="img" aria-label="Visa">
      <rect width="48" height="30" rx="5" fill="#1a1f71" />
      <text x="24" y="20" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontStyle="italic" fontSize="13" fill="#fff">
        VISA
      </text>
    </svg>
  );
}

function Mastercard() {
  return (
    <svg className={styles.pay} viewBox="0 0 48 30" role="img" aria-label="Mastercard">
      <rect width="48" height="30" rx="5" fill="#161616" />
      <circle cx="20" cy="15" r="9" fill="#eb001b" />
      <circle cx="28" cy="15" r="9" fill="#f79e1b" fillOpacity="0.85" />
    </svg>
  );
}

function Mir() {
  return (
    <svg className={styles.pay} viewBox="0 0 48 30" role="img" aria-label="Мир">
      <rect width="48" height="30" rx="5" fill="#d8232a" />
      <text x="24" y="19" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="11" fill="#fff">
        МИР
      </text>
    </svg>
  );
}

const legalLinks = [
  { href: "/agreement", label: "Соглашение" },
  { href: "/privacy", label: "Политика конфиденциальности" },
  { href: "/payment-info", label: "Правила оплаты" },
];

export default function Footer({ config }) {
  const { legal, name } = config;
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.payments}>
          <Visa />
          <Mastercard />
          <Mir />
        </div>

        <div className={styles.links}>
          {legalLinks.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
        </div>

        <div className={styles.legal}>
          <div className={styles.legalRow}>
            <span>ИП</span>
            <span>{legal.owner}</span>
          </div>
          <div className={styles.legalRow}>
            <span>ИНН</span>
            <span>{legal.inn}</span>
          </div>
          <div className={styles.legalRow}>
            <span>ОГРНИП</span>
            <span>{legal.ogrnip}</span>
          </div>
          <div className={styles.legalRow}>
            <span>Город</span>
            <span>{legal.city}</span>
          </div>
          <div className={styles.legalRow}>
            <span>Почта</span>
            <a href={`mailto:${legal.email}`}>{legal.email}</a>
          </div>
        </div>

        <p className={styles.disclaimer}>
          {name}.ru не связан с Mojang AB, все средства идут на развитие проекта.
        </p>
      </div>
    </footer>
  );
}
