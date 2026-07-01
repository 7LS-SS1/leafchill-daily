import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { createSession, verifyLogin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

export async function POST(request: Request) {
  const body = loginSchema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: "ข้อมูลเข้าสู่ระบบไม่ถูกต้อง" }, { status: 400 });

  const user = await verifyLogin(body.data.username, body.data.password);
  if (!user) return NextResponse.json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });

  const forwardedProto = headers().get("x-forwarded-proto");
  const explicitCookieSecure = process.env.COOKIE_SECURE?.toLowerCase();
  const secureCookie =
    explicitCookieSecure === "true"
      ? true
      : explicitCookieSecure === "false"
        ? false
        : forwardedProto
          ? forwardedProto.includes("https")
          : process.env.NODE_ENV === "production";

  await createSession(user.id, secureCookie);
  await prisma.auditLog.create({ data: { actorUserId: user.id, action: "LOGIN", entity: "users", entityId: user.id } });
  return NextResponse.json({ ok: true });
}
