import { AppShell } from "@/components/AppShell";
import { ClockPanelNext } from "@/components/ClockPanelNext";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AttendancePage() {
  const user = await requireUser();
  const records = await prisma.attendanceRecord.findMany({
    where: user.role === "STAFF" ? { employeeId: user.employeeId ?? undefined } : {},
    include: { employee: true },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 30
  });
  return (
    <AppShell user={user} title="เข้า-ออกงาน">
      <div className="grid gap-4 xl:grid-cols-[1fr_.9fr]">
        <ClockPanelNext />
        <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-soft">
          <h2 className="mb-3 text-lg font-black">รายการล่าสุด</h2>
          <div className="grid gap-2">
            {records.map((record) => (
              <div key={record.id} className="rounded-lg border border-stone-200 p-3">
                <div className="flex justify-between gap-3">
                  <strong>{record.employee.firstName} {record.employee.lastName}</strong>
                  <span className="text-sm text-stone-500">{record.date.toISOString().slice(0, 10)}</span>
                </div>
                <p className="mt-1 text-sm text-stone-600">{record.checkIn ?? "-"} → {record.checkOut ?? "-"} · {record.statusLabel}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
