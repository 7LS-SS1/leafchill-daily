const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { hashPassword } = require("./auth");
const { calculateDailyWage, evaluateAttendance } = require("./payroll");

const DATA_FILE = process.env.DATA_FILE
  ? path.resolve(process.env.DATA_FILE)
  : path.join(__dirname, "..", "data", "database.json");

function now() {
  return new Date().toISOString();
}

function id() {
  return crypto.randomUUID();
}

function thaiDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    hourCycle: "h23"
  }).formatToParts(date);
  const value = (type) => parts.find((part) => part.type === type)?.value;
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    time: `${value("hour")}:${value("minute")}`,
    hour: Number(value("hour")),
    minute: Number(value("minute")),
    second: Number(value("second"))
  };
}

function addDays(dateText, days) {
  const date = new Date(`${dateText}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function autoCloseOpenAttendance(data, actor = null, currentDate = new Date()) {
  const thaiNow = thaiDateParts(currentDate);
  if (thaiNow.hour < 6) return [];

  const closed = [];
  for (const record of data.attendanceRecords) {
    if (!record.checkIn || record.checkOut || record.date >= thaiNow.date) continue;
    record.checkOut = "00:30";
    record.checkOutDate = addDays(record.date, 1);
    record.autoClosed = true;
    record.autoClosedAt = now();
    record.updatedAt = now();
    recalculateAttendance(data, record);
    closed.push(record);
    audit(data, actor, "AUTO_CHECK_OUT", "attendance_records", record.id, {
      checkOut: record.checkOut,
      checkOutDate: record.checkOutDate
    });
  }
  return closed;
}

function initialData() {
  const today = thaiDateParts().date;
  const ownerId = id();
  const systemId = id();
  const emp1 = id();
  const emp2 = id();
  const r1 = id();
  const r2 = id();
  const r3 = id();
  const records = [
    {
      id: id(),
      employeeId: emp1,
      date: today,
      checkIn: "16:12",
      checkOut: "23:00",
      status: "ทำงาน",
      leaveTypeId: null,
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: id(),
      employeeId: emp2,
      date: today,
      checkIn: "17:10",
      checkOut: "23:10",
      status: "ทำงาน",
      leaveTypeId: null,
      createdAt: now(),
      updatedAt: now()
    }
  ];

  const data = {
    users: [
      {
        id: systemId,
        username: "system",
        passwordHash: hashPassword("system1234"),
        role: "SYSTEM",
        employeeId: null,
        active: true,
        createdAt: now(),
        updatedAt: now()
      },
      {
        id: ownerId,
        username: "owner",
        passwordHash: hashPassword("owner1234"),
        role: "Owner",
        employeeId: null,
        active: true,
        createdAt: now(),
        updatedAt: now()
      },
      {
        id: id(),
        username: "staff01",
        passwordHash: hashPassword("staff1234"),
        role: "Staff",
        employeeId: emp1,
        active: true,
        createdAt: now(),
        updatedAt: now()
      }
    ],
    employees: [
      {
        id: emp1,
        firstName: "มะลิ",
        lastName: "ใจดี",
        gender: "หญิง",
        age: 24,
        address: "แขวงลาดพร้าว กรุงเทพฯ",
        phone: "0812345678",
        lineId: "mali.j",
        position: "พนักงานเสิร์ฟ",
        startDate: "2026-05-01",
        status: "กำลังทำงาน",
        createdAt: now(),
        updatedAt: now()
      },
      {
        id: emp2,
        firstName: "ก้อง",
        lastName: "ตั้งใจ",
        gender: "ชาย",
        age: 29,
        address: "แขวงคลองตัน กรุงเทพฯ",
        phone: "0898765432",
        lineId: "kong.work",
        position: "ครัว",
        startDate: "2026-04-15",
        status: "กำลังทำงาน",
        createdAt: now(),
        updatedAt: now()
      }
    ],
    attendanceRules: [
      {
        id: r1,
        label: "มาปกติ",
        fromTime: "00:00",
        toTime: "16:31",
        deduction: 0,
        noPay: false,
        description: "เข้างานไม่เกิน 16:30",
        active: true,
        createdAt: now(),
        updatedAt: now()
      },
      {
        id: r2,
        label: "มาสาย",
        fromTime: "16:31",
        toTime: "17:00",
        deduction: 20,
        noPay: false,
        description: "หลัง 16:30 หัก 20 บาท",
        active: true,
        createdAt: now(),
        updatedAt: now()
      },
      {
        id: r3,
        label: "มาสายมาก",
        fromTime: "17:00",
        toTime: "18:00",
        deduction: 50,
        noPay: false,
        description: "ตั้งแต่ 17:00 หัก 50 บาท",
        active: true,
        createdAt: now(),
        updatedAt: now()
      },
      {
        id: id(),
        label: "ไม่ได้รับค่าแรง",
        fromTime: "18:00",
        toTime: null,
        deduction: 0,
        noPay: true,
        description: "หลัง 18:00 ไม่ได้รับค่าแรง",
        active: true,
        createdAt: now(),
        updatedAt: now()
      }
    ],
    leaveTypes: [
      { id: id(), name: "ลาป่วย", paid: false, createdAt: now(), updatedAt: now() },
      { id: id(), name: "ลากิจ", paid: false, createdAt: now(), updatedAt: now() },
      { id: id(), name: "ลาหยุด", paid: false, createdAt: now(), updatedAt: now() }
    ],
    leaveRecords: [],
    wageSettings: [
      { id: id(), employeeId: emp1, dailyWage: 450, active: true, createdAt: now(), updatedAt: now() },
      { id: id(), employeeId: emp2, dailyWage: 500, active: true, createdAt: now(), updatedAt: now() }
    ],
    attendanceRecords: records,
    wageCalculations: [],
    auditLogs: [],
    sessions: []
  };

  data.wageCalculations = records.map((record) => {
    const employee = data.employees.find((item) => item.id === record.employeeId);
    const wageSetting = data.wageSettings.find((item) => item.employeeId === record.employeeId && item.active);
    return {
      id: id(),
      ...calculateDailyWage(record, employee, wageSetting, data.attendanceRules),
      createdAt: now(),
      updatedAt: now()
    };
  });

  data.attendanceRecords = data.attendanceRecords.map((record) => ({
    ...record,
    status: evaluateAttendance(record, data.attendanceRules).status
  }));

  return data;
}

function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData(), null, 2));
  }
}

function load() {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function save(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

function audit(data, actor, action, entity, entityId, details = {}) {
  data.auditLogs.unshift({
    id: id(),
    actorUserId: actor?.id || null,
    action,
    entity,
    entityId,
    details,
    createdAt: now()
  });
}

function recalculateAttendance(data, record) {
  const employee = data.employees.find((item) => item.id === record.employeeId);
  const wageSetting = data.wageSettings.find((item) => item.employeeId === record.employeeId && item.active);
  if (!employee || !wageSetting) return null;

  const attendance = evaluateAttendance(record, data.attendanceRules);
  record.status = attendance.status;
  record.updatedAt = now();

  const existing = data.wageCalculations.find((item) => item.attendanceRecordId === record.id);
  const calculated = calculateDailyWage(record, employee, wageSetting, data.attendanceRules);
  if (existing) {
    Object.assign(existing, calculated, { updatedAt: now() });
    return existing;
  }
  const created = { id: id(), ...calculated, createdAt: now(), updatedAt: now() };
  data.wageCalculations.unshift(created);
  return created;
}

module.exports = {
  id,
  now,
  load,
  save,
  initialData,
  publicUser,
  audit,
  recalculateAttendance,
  thaiDateParts,
  addDays,
  autoCloseOpenAttendance,
  DATA_FILE
};
