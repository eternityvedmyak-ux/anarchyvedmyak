import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getConfig, saveConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getConfig());
}

export async function POST(req) {
  if (cookies().get("admin_auth")?.value !== "1") {
    return NextResponse.json({ ok: false, error: "Требуется вход в админ-панель" }, { status: 401 });
  }
  try {
    const data = await req.json();
    saveConfig(data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
