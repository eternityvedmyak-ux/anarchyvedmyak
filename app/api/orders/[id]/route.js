import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getOrder, markPaid } from "@/lib/orders";

export const dynamic = "force-dynamic";

export async function GET(_, { params }) {
  const o = getOrder(params.id);
  if (!o) return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
  return NextResponse.json(o);
}

// Подтверждение заказа. Публично недоступно — только из админки
// (админ подтверждает ручные/внешние платежи). Автоматически оплата
// подтверждается только через /api/payments/webhook с проверкой подписи.
export async function POST(_, { params }) {
  if (cookies().get("admin_auth")?.value !== "1") {
    return NextResponse.json({ ok: false, error: "Доступ запрещён" }, { status: 401 });
  }
  const o = markPaid(params.id);
  if (!o) return NextResponse.json({ ok: false, error: "Заказ не найден" }, { status: 404 });
  return NextResponse.json({ ok: true, order: o });
}
