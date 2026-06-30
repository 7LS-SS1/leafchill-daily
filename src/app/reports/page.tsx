import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ReportsPage() {
  const user = await requireUser();
  const calculations = await prisma.wageCalculation.findMany({
    where: user.role === "STAFF" ? { employeeId: user.employeeId ?? undefined } : {},
    include: { employee: true },
    orderBy: { date: "desc" },
    take: 100
  });
  const total = calculations.reduce((sum, item) => sum + Number(item.netWage), 0);
  return (
    <AppShell user={user} title="รายงาน">
      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-soft">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-black">รายงานค่าแรงย้อนหลัง</h2>
          <strong>รวม {total.toLocaleString("th-TH")} บาท</strong>
        </div>
        <div className="grid gap-2">
          {calculations.map((item) => (
            <div key={item.id} className="rounded-lg border border-stone-200 p-3">
              <div className="flex justify-between gap-3">
                <strong>{item.employee.firstName} {item.employee.lastName}</strong>
                <span>{item.date.toISOString().slice(0, 10)}</span>
              </div>
              <p className="text-sm text-stone-500">{item.statusLabel} · สุทธิ {Number(item.netWage).toLocaleString("th-TH")} บาท</p>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
