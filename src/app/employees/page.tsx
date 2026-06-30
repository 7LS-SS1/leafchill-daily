import { AppShell } from "@/components/AppShell";
import { SubmitButton } from "@/components/SubmitButton";
import { createEmployee } from "@/app/actions";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function EmployeesPage() {
  const user = await requireRole([Role.SYSTEM, Role.OWNER, Role.MANAGER]);
  const employees = await prisma.employee.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <AppShell user={user} title="พนักงาน">
      <section className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <form action={createEmployee} className="rounded-lg border border-stone-200 bg-white p-4 shadow-soft">
          <h2 className="mb-3 text-lg font-black">เพิ่มพนักงาน</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-bold">ชื่อ<input name="firstName" required /></label>
            <label className="text-sm font-bold">นามสกุล<input name="lastName" required /></label>
            <label className="text-sm font-bold">เพศ<input name="gender" /></label>
            <label className="text-sm font-bold">อายุ<input name="age" type="number" /></label>
            <label className="text-sm font-bold">เบอร์โทร<input name="phone" /></label>
            <label className="text-sm font-bold">Line ID<input name="lineId" /></label>
            <label className="text-sm font-bold">ตำแหน่ง<input name="position" /></label>
            <label className="text-sm font-bold">เริ่มงาน<input name="startDate" type="date" /></label>
            <label className="text-sm font-bold sm:col-span-2">ที่อยู่<textarea name="address" /></label>
          </div>
          <div className="mt-3"><SubmitButton>บันทึกพนักงาน</SubmitButton></div>
        </form>
        <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-soft">
          <h2 className="mb-3 text-lg font-black">รายชื่อพนักงาน</h2>
          <div className="grid gap-2">
            {employees.map((employee) => (
              <div key={employee.id} className="rounded-lg border border-stone-200 p-3">
                <strong>{employee.firstName} {employee.lastName}</strong>
                <p className="text-sm text-stone-500">{employee.position ?? "-"} · {employee.phone ?? "-"}</p>
              </div>
            ))}
          </div>
        </section>
      </section>
    </AppShell>
  );
}
