import { NextResponse } from "next/server";
import { AttendanceStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dateOnly, thaiNow } from "@/lib/time";
import { calculateNetWage, evaluateAttendance } from "@/lib/payroll-next";

async function recalculate(recordId: string) {
  const record = await prisma.attendanceRecord.findUnique({ where: { id: recordId } });
  if (!record) return;
  const rules = await prisma.attendanceRule.findMany();
  const wage = await prisma.wageSetting.findFirst({ where: { employeeId: record.employeeId, active: true }, orderBy: { createdAt: "desc" } });
  const result = evaluateAttendance(record, rules);
  const baseWage = Number(wage?.dailyWage ?? 0);
  const netWage = calculateNetWage(baseWage, result.deduction, result.noPay);

  await prisma.attendanceRecord.update({
    where: { id: record.id },
    data: { status: result.status, statusLabel: result.label }
  });
  await prisma.wageCalculation.upsert({
    where: { attendanceRecordId: record.id },
    update: { statusLabel: result.label, baseWage, deduction: result.noPay ? baseWage : result.deduction, netWage, note: result.note },
    create: {
      employeeId: record.employeeId,
      attendanceRecordId: record.id,
      date: record.date,
      statusLabel: result.label,
      baseWage,
      deduction: result.noPay ? baseWage : result.deduction,
      netWage,
      note: result.note
    }
  });
}

export async function GET() {
  const user = await requireUser();
  const employeeId = user.employeeId;
  if (!employeeId) return NextResponse.json({ error: "บัญชียังไม่ได้ผูกกับพนักงาน" }, { status: 400 });
  const today = thaiNow().date;
  const openRecord = await prisma.attendanceRecord.findFirst({
    where: { employeeId, checkIn: { not: null }, checkOut: null },
    orderBy: { date: "desc" }
  });
  const todayRecord = await prisma.attendanceRecord.findUnique({
    where: { employeeId_date: { employeeId, date: dateOnly(today) } }
  });
  return NextResponse.json({ openRecord, todayRecord, now: thaiNow() });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user.employeeId) return NextResponse.json({ error: "บัญชียังไม่ได้ผูกกับพนักงาน" }, { status: 400 });

  const { action } = await request.json();
  const now = thaiNow();

  if (action === "check-in") {
    const existing = await prisma.attendanceRecord.findUnique({
      where: { employeeId_date: { employeeId: user.employeeId, date: dateOnly(now.date) } }
    });
    if (existing?.checkIn) return NextResponse.json({ error: "วันนี้เช็คเข้างานแล้ว" }, { status: 409 });
    const record = existing
      ? await prisma.attendanceRecord.update({ where: { id: existing.id }, data: { checkIn: now.time, status: AttendanceStatus.WORKING, statusLabel: "ทำงาน" } })
      : await prisma.attendanceRecord.create({ data: { employeeId: user.employeeId, date: dateOnly(now.date), checkIn: now.time, status: AttendanceStatus.WORKING, statusLabel: "ทำงาน" } });
    await recalculate(record.id);
    return NextResponse.json({ record });
  }

  if (action === "check-out") {
    const record = await prisma.attendanceRecord.findFirst({
      where: { employeeId: user.employeeId, checkIn: { not: null }, checkOut: null },
      orderBy: { date: "desc" }
    });
    if (!record) return NextResponse.json({ error: "ไม่พบรายการเข้างานที่ยังไม่ออกงาน" }, { status: 404 });
    const updated = await prisma.attendanceRecord.update({
      where: { id: record.id },
      data: { checkOut: now.time, checkOutDate: dateOnly(now.date), autoClosed: false }
    });
    await recalculate(record.id);
    return NextResponse.json({ record: updated });
  }

  return NextResponse.json({ error: "action ไม่ถูกต้อง" }, { status: 400 });
}
