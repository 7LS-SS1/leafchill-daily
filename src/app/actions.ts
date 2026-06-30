"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { Role, EmployeeStatus } from "@prisma/client";
import { requireRole, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function createEmployee(formData: FormData) {
  const actor = await requireUser();
  const firstName = String(formData.get("firstName") ?? "");
  const lastName = String(formData.get("lastName") ?? "");
  if (!firstName || !lastName) return;
  const employee = await prisma.employee.create({
    data: {
      firstName,
      lastName,
      gender: String(formData.get("gender") ?? ""),
      age: Number(formData.get("age") || 0) || null,
      phone: String(formData.get("phone") ?? ""),
      lineId: String(formData.get("lineId") ?? ""),
      position: String(formData.get("position") ?? ""),
      address: String(formData.get("address") ?? ""),
      startDate: formData.get("startDate") ? new Date(String(formData.get("startDate"))) : null,
      status: EmployeeStatus.ACTIVE
    }
  });
  await prisma.auditLog.create({ data: { actorUserId: actor.id, action: "CREATE", entity: "employees", entityId: employee.id } });
  revalidatePath("/employees");
}

export async function createUser(formData: FormData) {
  const actor = await requireRole([Role.SYSTEM, Role.OWNER]);
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "STAFF") as Role;
  if (!username || !password) return;
  const user = await prisma.user.create({
    data: {
      username,
      passwordHash: await bcrypt.hash(password, 12),
      role,
      employeeId: String(formData.get("employeeId") || "") || null
    }
  });
  await prisma.auditLog.create({ data: { actorUserId: actor.id, action: "CREATE", entity: "users", entityId: user.id } });
  revalidatePath("/users");
}

export async function createRule(formData: FormData) {
  const actor = await requireRole([Role.SYSTEM, Role.OWNER]);
  const rule = await prisma.attendanceRule.create({
    data: {
      label: String(formData.get("label") ?? ""),
      fromTime: String(formData.get("fromTime") ?? "00:00"),
      toTime: String(formData.get("toTime") || "") || null,
      deduction: Number(formData.get("deduction") || 0),
      noPay: formData.get("noPay") === "on",
      description: String(formData.get("description") ?? "")
    }
  });
  await prisma.auditLog.create({ data: { actorUserId: actor.id, action: "CREATE", entity: "attendance_rules", entityId: rule.id } });
  revalidatePath("/rules");
}

export async function createWageSetting(formData: FormData) {
  const actor = await requireRole([Role.SYSTEM, Role.OWNER]);
  const employeeId = String(formData.get("employeeId") ?? "");
  if (!employeeId) return;
  await prisma.wageSetting.updateMany({ where: { employeeId }, data: { active: false } });
  const wage = await prisma.wageSetting.create({ data: { employeeId, dailyWage: Number(formData.get("dailyWage") || 0), active: true } });
  await prisma.auditLog.create({ data: { actorUserId: actor.id, action: "CREATE", entity: "wage_settings", entityId: wage.id } });
  revalidatePath("/wages");
}
