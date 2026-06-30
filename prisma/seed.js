const { PrismaClient, Role, EmployeeStatus } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const passwordOwner = await bcrypt.hash("owner1234", 12);
  const passwordSystem = await bcrypt.hash("system1234", 12);
  const passwordStaff = await bcrypt.hash("staff1234", 12);

  await prisma.auditLog.deleteMany();
  await prisma.wageCalculation.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.wageSetting.deleteMany();
  await prisma.leaveRecord.deleteMany();
  await prisma.leaveType.deleteMany();
  await prisma.attendanceRule.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.employee.deleteMany();

  const mali = await prisma.employee.create({
    data: {
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
    }
  });

  const kong = await prisma.employee.create({
    data: {
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
    }
  });

  await prisma.user.createMany({
    data: [
      { username: "system", passwordHash: passwordSystem, role: Role.SYSTEM },
      { username: "owner", passwordHash: passwordOwner, role: Role.OWNER },
      { username: "staff01", passwordHash: passwordStaff, role: Role.STAFF, employeeId: mali.id }
    ]
  });

  await prisma.attendanceRule.createMany({
    data: [
      { label: "มาปกติ", fromTime: "00:00", toTime: "16:31", deduction: 0, description: "เข้างานไม่เกิน 16:30" },
      { label: "มาสาย", fromTime: "16:31", toTime: "17:00", deduction: 20, description: "หลัง 16:30 หัก 20 บาท" },
      { label: "มาสายมาก", fromTime: "17:00", toTime: "18:00", deduction: 50, description: "ตั้งแต่ 17:00 หัก 50 บาท" },
      { label: "ไม่ได้รับค่าแรง", fromTime: "18:00", toTime: null, deduction: 0, noPay: true, description: "หลัง 18:00 ไม่ได้รับค่าแรง" }
    ]
  });

  await prisma.leaveType.createMany({
    data: [
      { name: "ลาป่วย" },
      { name: "ลากิจ" },
      { name: "ลาหยุด" }
    ]
  });

  await prisma.wageSetting.createMany({
    data: [
      { employeeId: mali.id, dailyWage: 450 },
      { employeeId: kong.id, dailyWage: 500 }
    ]
  });

  console.log("Seed completed: system/system1234, owner/owner1234, staff01/staff1234");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
