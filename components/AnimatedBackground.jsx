export default function AnimatedBackground() {
  const blob = (color, size, top, left, delay, dur) => ({
    position: "absolute",
    width: size,
    height: size,
    top,
    left,
    borderRadius: "50%",
    background: color,
    filter: "blur(90px)",
    opacity: 0.5,
    animation: `auroraShift ${dur}s linear infinite`,
    animationDelay: `${delay}s`,
    willChange: "transform",
  });

  return (
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: -1,
          overflow: "hidden",
          background:
            "radial-gradient(1200px 700px at 50% -15%, var(--glow), transparent 60%), var(--bg)",
        }}
      >
        <div style={blob("radial-gradient(circle, var(--blob1), transparent 70%)", "46vw", "-12%", "-8%", 0, 28)} />
        <div style={blob("radial-gradient(circle, var(--blob2), transparent 70%)", "52vw", "20%", "55%", -8, 34)} />
        <div style={blob("radial-gradient(circle, var(--blob3), transparent 70%)", "40vw", "55%", "-10%", -4, 30)} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "54px 54px",
          maskImage: "radial-gradient(circle at 50% 30%, #000, transparent 80%)",
          WebkitMaskImage: "radial-gradient(circle at 50% 30%, #000, transparent 80%)",
        }}
      />
    </div>
  );
}
