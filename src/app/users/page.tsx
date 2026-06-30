import { Role } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { SubmitButton } from "@/components/SubmitButton";
import { createUser } from "@/app/actions";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function UsersPage() {
  const user = await requireRole([Role.SYSTEM, Role.OWNER]);
  const [users, employees] = await Promise.all([
    prisma.user.findMany({ include: { employee: true }, orderBy: { createdAt: "desc" } }),
    prisma.employee.findMany({ orderBy: { firstName: "asc" } })
  ]);
  return (
    <AppShell user={user} title="ผู้ใช้งาน">
      <section className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <form action={createUser} className="rounded-lg border border-stone-200 bg-white p-4 shadow-soft">
          <h2 className="mb-3 text-lg font-black">เพิ่มผู้ใช้</h2>
          <div className="grid gap-3">
            <label className="text-sm font-bold">Username<input name="username" required /></label>
            <label className="text-sm font-bold">Password<input name="password" type="password" required /></label>
            <label className="text-sm font-bold">Role<select name="role">{Object.values(Role).map((role) => <option key={role}>{role}</option>)}</select></label>
            <label className="text-sm font-bold">ผูกกับพนักงาน<select name="employeeId"><option value="">ไม่ระบุ</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName}</option>)}</select></label>
          </div>
          <div className="mt-3"><SubmitButton>บันทึกผู้ใช้</SubmitButton></div>
        </form>
        <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-soft">
          <h2 className="mb-3 text-lg font-black">บัญชีผู้ใช้</h2>
          <div className="grid gap-2">
            {users.map((item) => (
              <div key={item.id} className="rounded-lg border border-stone-200 p-3">
                <strong>{item.username}</strong>
                <p className="text-sm text-stone-500">{item.role} · {item.employee ? `${item.employee.firstName} ${item.employee.lastName}` : "ไม่ผูกพนักงาน"}</p>
              </div>
            ))}
          </div>
        </section>
      </section>
    </AppShell>
  );
}
