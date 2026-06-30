import { NextResponse } from "next/server";
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

  await createSession(user.id);
  await prisma.auditLog.create({ data: { actorUserId: user.id, action: "LOGIN", entity: "users", entityId: user.id } });
  return NextResponse.json({ ok: true });
}
