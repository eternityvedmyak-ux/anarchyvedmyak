import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { markPaid } from "@/lib/orders";
import { verifyLavaNotification } from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const payment = getConfig().payment || {};
    const body = await req.json();

    // Только реальный провайдер с проверкой подписи может подтверждать оплату.
    if (payment.provider !== "lava") {
      // В демо/неподключенном режиме оплату НЕ подтверждаем автоматически —
      // иначе любой мог бы бесплатно получить товар.
      return NextResponse.json({ ok: false, error: "payment not configured" }, { status: 400 });
    }

    // Реальный провайдер: проверяем подпись.
    if (!verifyLavaNotification(body, payment)) {
      return NextResponse.json({ ok: false, error: "bad signature" }, { status: 401 });
    }

    const success =
      body.status === "success" || body.status === "paid" || body.type === "pay";
    if (success && body.orderId) {
      markPaid(body.orderId);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
