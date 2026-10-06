import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AnimatedBackground from "@/components/AnimatedBackground";
import SeasonalFX from "@/components/SeasonalFX";
import { getConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

function getSeason() {
  const m = new Date().getMonth();
  if (m >= 5 && m <= 7) return "summer";
  if (m === 8 || m === 9) return "autumn";
  if (m === 11 || m === 0 || m === 1) return "winter";
  return "spring";
}

export default function RootLayout({ children }) {
  const config = getConfig();
  const season = getSeason();
  return (
    <html lang="ru" data-season={season}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&family=Press+Start+2P&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AnimatedBackground />
        <SeasonalFX />
        <Header config={config} />
        <main>{children}</main>
        <Footer config={config} />
      </body>
    </html>
  );
}
