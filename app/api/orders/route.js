import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createOrder, listOrders } from "@/lib/orders";
import { buildPayUrl } from "@/lib/payments";

export const dynamic = "force-dynamic";

// Список заказов — только для админа.
export async function GET() {
  if (cookies().get("admin_auth")?.value !== "1") {
    return NextResponse.json({ ok: false, error: "Доступ запрещён" }, { status: 401 });
  }
  return NextResponse.json(listOrders().slice(-100).reverse());
}

// Создание заказа (публично, из формы покупки).
export async function POST(req) {
  try {
    const b = await req.json();
    if (!b.itemId || !b.nickname || b.price == null) {
      return NextResponse.json({ ok: false, error: "Укажите товар, ник и цену" }, { status: 400 });
    }
    const order = createOrder({
      itemId: b.itemId,
      itemType: b.itemType || "donate",
      name: b.name || b.itemId,
      price: Number(b.price),
      nickname: String(b.nickname).slice(0, 32),
    });
    const payUrl = buildPayUrl(order);
    return NextResponse.json({ ok: true, order, payUrl });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
