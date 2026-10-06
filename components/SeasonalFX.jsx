"use client";

import { useEffect, useRef } from "react";

// Сезон по текущему месяцу:
//  лето (июн–авг): солнце с лучами
//  осень (сен–окт): падающие листья + дождь
//  зима (дек–фев): снег
//  весна (мар–май): молодая листва / лепестки
function getSeason(m) {
  if (m >= 5 && m <= 7) return "summer";
  if (m === 8 || m === 9) return "autumn";
  if (m === 11 || m === 0 || m === 1) return "winter";
  return "spring";
}

export default function SeasonalFX() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    const m = new Date().getMonth();
    const season = getSeason(m);

    let w = 0, h = 0, dpr = 1, raf = 0, t = 0, sunRot = 0;
    let particles = [];
    let rain = [];

    const rand = (a, b) => a + Math.random() * (b - a);
    const leafColors =
      season === "spring"
        ? ["#9be15d", "#c6f36b", "#ffd1e8", "#ffb3d1"]
        : ["#e8923a", "#d96b27", "#c24b1f", "#e0b04a", "#a8501f"];

    function makeP() {
      const isLeaf = season !== "winter";
      return {
        x: rand(0, w),
        y: rand(-h, 0),
        s: isLeaf ? rand(6, 12) : rand(2, 5),
        sp: rand(0.4, 1.4),
        sway: rand(0.5, 1.8),
        phase: rand(0, Math.PI * 2),
        rot: rand(0, Math.PI * 2),
        rotSp: rand(-0.04, 0.04),
        color: leafColors[Math.floor(rand(0, leafColors.length))],
      };
    }

    function initParticles() {
      particles = [];
      rain = [];
      if (season === "summer") return; // солнце рисуется отдельно
      const count = season === "winter" ? 90 : season === "autumn" ? 34 : 40;
      for (let i = 0; i < count; i++) particles.push(makeP());
      if (season === "autumn") {
        for (let i = 0; i < 60; i++)
          rain.push({ x: rand(0, w), y: rand(0, h), len: rand(10, 22), sp: rand(6, 12) });
      }
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initParticles();
    }

    function drawP(p) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = p.color;
      if (season === "winter") {
        ctx.beginPath();
        ctx.arc(0, 0, p.s, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.ellipse(0, 0, p.s, p.s * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    function drawRain() {
      ctx.strokeStyle = "rgba(150,190,255,0.25)";
      ctx.lineWidth = 1;
      for (const r of rain) {
        r.y += r.sp;
        r.x -= 0.5;
        if (r.y > h) {
          r.y = -10;
          r.x = rand(0, w);
        }
        ctx.beginPath();
        ctx.moveTo(r.x, r.y);
        ctx.lineTo(r.x - 2, r.y + r.len);
        ctx.stroke();
      }
    }

    function drawSun() {
      sunRot += 0.003;
      const cx = w * 0.85;
      const cy = h * 0.16;
      const R = 54;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(sunRot);
      ctx.strokeStyle = "rgba(255,210,120,0.35)";
      ctx.lineWidth = 3;
      for (let i = 0; i < 12; i++) {
        ctx.rotate(Math.PI / 6);
        ctx.beginPath();
        ctx.moveTo(R + 10, 0);
        ctx.lineTo(R + 34, 0);
        ctx.stroke();
      }
      ctx.restore();

      const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, R * 2.4);
      g.addColorStop(0, "rgba(255,224,150,0.95)");
      g.addColorStop(0.4, "rgba(255,190,90,0.5)");
      g.addColorStop(1, "rgba(255,170,60,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 2.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255,236,180,0.95)";
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    function frame() {
      t += 0.016;
      ctx.clearRect(0, 0, w, h);
      if (season === "summer") {
        drawSun();
      } else {
        for (const p of particles) {
          p.y += p.sp + (season === "winter" ? 0.3 : 0.2);
          p.x += Math.sin(t * p.sway + p.phase) * 0.6;
          p.rot += p.rotSp;
          if (p.y > h + 20) {
            p.y = -20;
            p.x = rand(0, w);
          }
          drawP(p);
        }
        if (season === "autumn") drawRain();
      }
      raf = requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{ position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none" }}
    />
  );
}
