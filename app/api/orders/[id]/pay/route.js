import { NextResponse } from "next/server";
import { getOrder } from "@/lib/orders";
import { buildPayUrl } from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function GET(_, { params }) {
  const o = getOrder(params.id);
  if (!o) return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
  const payUrl = buildPayUrl(o);
  return NextResponse.json({ payUrl: payUrl.startsWith("http") ? payUrl : null });
}
