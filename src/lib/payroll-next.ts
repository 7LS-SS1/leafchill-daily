import { AttendanceStatus, type AttendanceRule } from "@prisma/client";
import { addDays } from "./time";

function toMinutes(time?: string | null) {
  if (!time) return null;
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function isEarlyCheckOut(record: { date: Date; checkIn?: string | null; checkOut?: string | null; checkOutDate?: Date | null }) {
  if (!record.checkIn || !record.checkOut) return false;
  const dateText = record.date.toISOString().slice(0, 10);
  const expectedDate = addDays(dateText, 1);
  const checkOutDate = (record.checkOutDate ?? record.date).toISOString().slice(0, 10);
  if (checkOutDate < expectedDate) return true;
  if (checkOutDate > expectedDate) return false;
  return (toMinutes(record.checkOut) ?? 0) < (toMinutes("00:30") ?? 0);
}

export function evaluateAttendance(
  record: { date: Date; checkIn?: string | null; checkOut?: string | null; checkOutDate?: Date | null },
  rules: AttendanceRule[]
) {
  if (!record.checkIn) {
    return { status: AttendanceStatus.ABSENT, label: "ขาดงาน", deduction: 0, noPay: true, note: "ไม่มีเวลาเข้างาน" };
  }

  const checkInMinutes = toMinutes(record.checkIn) ?? 0;
  const rule = [...rules]
    .filter((item) => item.active)
    .sort((a, b) => (toMinutes(a.fromTime) ?? 0) - (toMinutes(b.fromTime) ?? 0))
    .find((item) => {
      const from = toMinutes(item.fromTime) ?? 0;
      const to = item.toTime ? toMinutes(item.toTime) ?? Infinity : Infinity;
      return checkInMinutes >= from && checkInMinutes < to;
    });

  let label = rule?.noPay ? "ไม่ได้รับค่าแรง" : rule?.label ?? "มาปกติ";
  let status: AttendanceStatus = rule?.noPay ? AttendanceStatus.NO_PAY : label.includes("สาย") ? AttendanceStatus.LATE : AttendanceStatus.NORMAL;
  const deduction = Number(rule?.deduction ?? 0);
  const noPay = Boolean(rule?.noPay);
  let note = rule?.description ?? label;

  if (isEarlyCheckOut(record)) {
    label = `${label} / ออกก่อนเวลา`;
    status = AttendanceStatus.EARLY_LEAVE;
    note = `${note}; ทำงานไม่ครบเวลา`;
  }

  return { status, label, deduction, noPay, note };
}

export function calculateNetWage(baseWage: number, deduction: number, noPay: boolean) {
  return noPay ? 0 : Math.max(0, baseWage - deduction);
}
