import { Role } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { SubmitButton } from "@/components/SubmitButton";
import { createWageSetting } from "@/app/actions";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function WagesPage() {
  const user = await requireRole([Role.SYSTEM, Role.OWNER]);
  const [employees, wages] = await Promise.all([
    prisma.employee.findMany({ orderBy: { firstName: "asc" } }),
    prisma.wageSetting.findMany({ where: { active: true }, include: { employee: true }, orderBy: { createdAt: "desc" } })
  ]);
  return (
    <AppShell user={user} title="ค่าแรง">
      <section className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <form action={createWageSetting} className="rounded-lg border border-stone-200 bg-white p-4 shadow-soft">
          <h2 className="mb-3 text-lg font-black">ตั้งค่าค่าแรง</h2>
          <label className="text-sm font-bold">พนักงาน<select name="employeeId">{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName}</option>)}</select></label>
          <label className="mt-3 block text-sm font-bold">ค่าแรงรายวัน<input name="dailyWage" type="number" required /></label>
          <div className="mt-3"><SubmitButton>บันทึกค่าแรง</SubmitButton></div>
        </form>
        <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-soft">
          <h2 className="mb-3 text-lg font-black">ค่าแรงปัจจุบัน</h2>
          <div className="grid gap-2">
            {wages.map((wage) => (
              <div key={wage.id} className="flex justify-between rounded-lg border border-stone-200 p-3">
                <strong>{wage.employee.firstName} {wage.employee.lastName}</strong>
                <span>{Number(wage.dailyWage).toLocaleString("th-TH")} บาท</span>
              </div>
            ))}
          </div>
        </section>
      </section>
    </AppShell>
  );
}
