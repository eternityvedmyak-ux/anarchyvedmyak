import { getConfig } from "@/lib/config";
import SocialIcon from "@/components/SocialIcons";
import Reveal from "@/components/Reveal";
import styles from "./contacts.module.css";

export const dynamic = "force-dynamic";

const cfg0 = getConfig();

export const metadata = { title: `Контакты — ${cfg0.name}` };

export default function ContactsPage() {
  const { social, email, serverIp, name } = getConfig();

  const socials = [
    { type: "telegram", title: "Телеграм", desc: "Новости, обновления и быстрая поддержка в Telegram-канале.", href: social.telegram },
    { type: "vk", title: "ВКонтакте", desc: "Группа сервера: анонсы, конкурсы и общение с игроками.", href: social.vk },
    { type: "discord", title: "Discord", desc: "Голосовые каналы, ивенты и техподдержка в Discord.", href: social.discord },
  ].filter((s) => s.href);

  return (
    <section className="section">
      <div className="container">
        <Reveal>
          <span className="badge">Связь</span>
          <h1 className="section-title grad-text" style={{ marginTop: 12 }}>
            Контакты
          </h1>
          <p className="section-sub">Присоединяйся к нашим сообществам и пиши нам</p>
        </Reveal>

        {socials.length > 0 ? (
          <div className={styles.wrap}>
            {socials.map((s, i) => (
              <Reveal key={s.type} delay={i * 0.08}>
                <a className={styles.card} href={s.href} target="_blank" rel="noopener noreferrer">
                  <span className={styles.icon}>
                    <SocialIcon type={s.type} size={34} />
                  </span>
                  <h3 className={styles.title}>{s.title}</h3>
                  <p className={styles.desc}>{s.desc}</p>
                  <span className={styles.cta}>Перейти →</span>
                </a>
              </Reveal>
            ))}
          </div>
        ) : (
          <Reveal>
            <p className="muted" style={{ textAlign: "center" }}>
              Соцсети появятся здесь, как только будут готовы. А пока пиши нам на почту.
            </p>
          </Reveal>
        )}

        <Reveal>
          <div className={styles.contactBox} style={{ marginTop: 30 }}>
            <div className="pill">
              <span>Почта</span>
              <a href={`mailto:${email}`} style={{ color: "var(--accent-2)" }}>
                {email}
              </a>
            </div>
            <div className="pill">
              <span>IP сервера</span>
              <strong>{serverIp}</strong>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
