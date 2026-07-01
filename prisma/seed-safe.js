const { PrismaClient, Role, EmployeeStatus } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function findOrCreateEmployee(data) {
  const existing = await prisma.employee.findFirst({ where: { phone: data.phone } });
  if (existing) return existing;
  return prisma.employee.create({ data });
}

async function ensureRule(data) {
  const existing = await prisma.attendanceRule.findFirst({
    where: { label: data.label, fromTime: data.fromTime, toTime: data.toTime ?? null }
  });
  if (existing) return existing;
  return prisma.attendanceRule.create({ data });
}

async function ensureLeaveType(name) {
  return prisma.leaveType.upsert({
    where: { name },
    update: {},
    create: { name }
  });
}

async function ensureActiveWage(employeeId, dailyWage) {
  const existing = await prisma.wageSetting.findFirst({
    where: { employeeId, active: true },
    orderBy: { createdAt: "desc" }
  });
  if (existing) return existing;
  return prisma.wageSetting.create({ data: { employeeId, dailyWage } });
}

async function main() {
  const [passwordOwner, passwordSystem, passwordStaff] = await Promise.all([
    bcrypt.hash("owner1234", 12),
    bcrypt.hash("system1234", 12),
    bcrypt.hash("staff1234", 12)
  ]);

  const mali = await findOrCreateEmployee({
    firstName: "มะลิ",
    lastName: "ใจดี",
    gender: "หญิง",
    age: 24,
    address: "ลาดพร้าว กรุงเทพฯ",
    phone: "0812345678",
    lineId: "mali.j",
    position: "พนักงานเสิร์ฟ",
    startDate: new Date("2026-05-01"),
    status: EmployeeStatus.ACTIVE
  });

  const kong = await findOrCreateEmployee({
    firstName: "ก้อง",
    lastName: "ตั้งใจ",
    gender: "ชาย",
    age: 29,
    address: "คลองเตย กรุงเทพฯ",
    phone: "0898765432",
    lineId: "kong.work",
    position: "ครัว",
    startDate: new Date("2026-04-15"),
    status: EmployeeStatus.ACTIVE
  });

  await prisma.user.upsert({
    where: { username: "system" },
    update: { passwordHash: passwordSystem, role: Role.SYSTEM, active: true },
    create: { username: "system", passwordHash: passwordSystem, role: Role.SYSTEM }
  });
  await prisma.user.upsert({
    where: { username: "owner" },
    update: { passwordHash: passwordOwner, role: Role.OWNER, active: true },
    create: { username: "owner", passwordHash: passwordOwner, role: Role.OWNER }
  });
  await prisma.user.upsert({
    where: { username: "staff01" },
    update: { passwordHash: passwordStaff, role: Role.STAFF, employeeId: mali.id, active: true },
    create: { username: "staff01", passwordHash: passwordStaff, role: Role.STAFF, employeeId: mali.id }
  });

  await Promise.all([
    ensureRule({ label: "มาปกติ", fromTime: "00:00", toTime: "16:31", deduction: 0, description: "เข้างานไม่เกิน 16:30" }),
    ensureRule({ label: "มาสาย", fromTime: "16:31", toTime: "17:00", deduction: 20, description: "หลัง 16:30 หัก 20 บาท" }),
    ensureRule({ label: "มาสายมาก", fromTime: "17:00", toTime: "18:00", deduction: 50, description: "ตั้งแต่ 17:00 หัก 50 บาท" }),
    ensureRule({ label: "ไม่ได้รับค่าแรง", fromTime: "18:00", toTime: null, deduction: 0, noPay: true, description: "หลัง 18:00 ไม่ได้รับค่าแรง" })
  ]);

  await Promise.all([ensureLeaveType("ลาป่วย"), ensureLeaveType("ลากิจ"), ensureLeaveType("ลาหยุด")]);
  await Promise.all([ensureActiveWage(mali.id, 450), ensureActiveWage(kong.id, 500)]);

  console.log("Seed completed safely: system/system1234, owner/owner1234, staff01/staff1234");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
