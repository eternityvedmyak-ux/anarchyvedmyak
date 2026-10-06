import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { login, password } = await req.json();
    const ok = login === process.env.ADMIN_LOGIN && password === process.env.ADMIN_PASSWORD;
    if (!ok) {
      return NextResponse.json({ ok: false, error: "Неверный логин или пароль" }, { status: 401 });
    }
    const res = NextResponse.json({ ok: true });
    res.cookies.set("admin_auth", "1", {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch {
    return NextResponse.json({ ok: false, error: "Ошибка запроса" }, { status: 400 });
  }
}
