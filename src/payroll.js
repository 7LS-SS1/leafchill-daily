function toMinutes(time) {
  if (!time) return null;
  const [hour, minute] = String(time).split(":").map(Number);
  return hour * 60 + minute;
}

function addDays(dateText, days) {
  const date = new Date(`${dateText}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function isEarlyCheckOut(record) {
  if (!record.checkIn || !record.checkOut) return false;
  const expectedDate = addDays(record.date, 1);
  const checkOutDate = record.checkOutDate || record.date;
  if (checkOutDate < expectedDate) return true;
  if (checkOutDate > expectedDate) return false;
  return toMinutes(record.checkOut) < toMinutes("00:30");
}

function withEarlyCheckOut(attendance, record) {
  if (!isEarlyCheckOut(record)) return attendance;
  if (attendance.status.includes("ออกก่อนเวลา")) return attendance;
  return {
    ...attendance,
    status: `${attendance.status} / ออกก่อนเวลา`,
    note: `${attendance.note}; ทำงานไม่ครบเวลา`
  };
}

function evaluateAttendance(record, rules) {
  if (record.status === "ลา") {
    return { status: "ลา", deduction: 0, noPay: true, note: "ลา" };
  }
  if (record.status === "ขาดงาน" || !record.checkIn) {
    return { status: "ขาดงาน", deduction: 0, noPay: true, note: "ไม่มีเวลาเข้างาน" };
  }

  const checkInMinutes = toMinutes(record.checkIn);
  const orderedRules = [...rules]
    .filter((rule) => rule.active)
    .sort((a, b) => toMinutes(a.fromTime) - toMinutes(b.fromTime));

  for (const rule of orderedRules) {
    const from = toMinutes(rule.fromTime);
    const to = rule.toTime ? toMinutes(rule.toTime) : Infinity;
    if (checkInMinutes >= from && checkInMinutes < to) {
      return withEarlyCheckOut({
        status: rule.noPay ? "ไม่ได้รับค่าแรง" : rule.label,
        deduction: Number(rule.deduction || 0),
        noPay: Boolean(rule.noPay),
        note: rule.description || rule.label
      }, record);
    }
  }

  return { status: "มาปกติ", deduction: 0, noPay: false, note: "ตรงตามเวลา" };
}

function calculateDailyWage(record, employee, wageSetting, rules) {
  const baseWage = Number(wageSetting?.dailyWage || 0);
  const attendance = evaluateAttendance(record, rules);
  const netWage = attendance.noPay ? 0 : Math.max(0, baseWage - attendance.deduction);

  return {
    employeeId: employee.id,
    attendanceRecordId: record.id,
    date: record.date,
    baseWage,
    deduction: attendance.noPay ? baseWage : attendance.deduction,
    netWage,
    status: attendance.status,
    note: attendance.note
  };
}

module.exports = {
  evaluateAttendance,
  calculateDailyWage
};
