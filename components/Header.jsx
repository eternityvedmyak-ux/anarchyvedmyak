"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import SocialIcon from "@/components/SocialIcons";
import styles from "./Header.module.css";

const navLinks = [
  { href: "/", label: "Главная" },
  { href: "/rules", label: "Правила" },
  { href: "/shop", label: "Магазин" },
  { href: "/contacts", label: "Контакты" },
  { href: "/howto", label: "Как зайти" },
];

export default function Header({ config }) {
  const pathname = usePathname();
  const { name, tagline, social } = config;
  const [open, setOpen] = useState(false);
  // Скрытие шапки вниз / появление снизу при скролле вверх
  const [headerHidden, setHeaderHidden] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [progress, setProgress] = useState(0);
  const lastY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const goingDown = y > lastY.current;
      setProgress(
        Math.min(100, Math.max(0, (y / (document.documentElement.scrollHeight - window.innerHeight || 1)) * 100))
      );
      if (y < 80) {
        setHeaderHidden(false);
        setShowTop(false);
      } else if (Math.abs(y - lastY.current) > 6) {
        setHeaderHidden(goingDown);
        setShowTop(goingDown);
      }
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Прогресс-бар скролла */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 3, zIndex: 60, pointerEvents: "none" }}>
        <div
          style={{
            height: "100%",
            width: progress + "%",
            background: "var(--grad)",
            boxShadow: "0 0 12px rgba(139,92,246,0.6)",
            transition: "width 0.1s linear",
          }}
        />
      </div>

      <header
        className={styles.bar}
        style={{
          transform: headerHidden ? "translateY(-130%)" : "translateY(0)",
          transition: "transform 0.45s cubic-bezier(.22,1,.36,1)",
          willChange: "transform",
        }}
      >
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.brand}>
          <img className={styles.logo} src="/images/logo.jpg" alt={name} />
          <span className={styles.brandText}>
            <span className={`${styles.brandName} grad-text`}>{name}</span>
            <span className={styles.brandTag}>{tagline}</span>
          </span>
        </Link>

        <nav className={styles.nav}>
          {navLinks.map((l) => {
            const active = pathname === l.href;
            return (
              <Link key={l.href} href={l.href} className={styles.link}>
                {active && (
                  <motion.span
                    layoutId="navActive"
                    className={styles.activeBg}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className={`${styles.linkText} ${active ? "" : ""}`} style={active ? { color: "#fff" } : undefined}>
                  {l.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.socials}>
          {social.telegram && (
            <a className={styles.socialBtn} href={social.telegram} target="_blank" rel="noopener noreferrer" aria-label="Телеграм">
              <SocialIcon type="telegram" />
            </a>
          )}
          {social.vk && (
            <a className={styles.socialBtn} href={social.vk} target="_blank" rel="noopener noreferrer" aria-label="ВКонтакте">
              <SocialIcon type="vk" />
            </a>
          )}
          {social.discord && (
            <a className={styles.socialBtn} href={social.discord} target="_blank" rel="noopener noreferrer" aria-label="Discord">
              <SocialIcon type="discord" />
            </a>
          )}
        </div>

        <button className={styles.burger} onClick={() => setOpen((o) => !o)} aria-label="Меню">
          <span /><span /><span />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className={styles.mobilePanel}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {navLinks.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`${styles.mobileLink} ${active ? styles.mobileActive : ""}`}
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </header>

      {/* Плавающая кнопка «Наверх»: появляется при скролле вниз, исчезает вверх */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Наверх"
        style={{
          position: "fixed",
          right: 22,
          bottom: 22,
          zIndex: 60,
          width: 52,
          height: 52,
          borderRadius: "50%",
          border: "1px solid var(--border-strong)",
          background: "var(--grad)",
          color: "#fff",
          fontSize: 22,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 10px 30px rgba(139,92,246,0.45)",
          transform: showTop ? "translateY(0) scale(1)" : "translateY(150%) scale(0.8)",
          opacity: showTop ? 1 : 0,
          transition: "transform 0.45s cubic-bezier(.22,1,.36,1), opacity 0.35s ease",
          pointerEvents: showTop ? "auto" : "none",
        }}
      >
        ↑
      </button>
    </>
  );
}
