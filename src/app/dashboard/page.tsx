import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dateOnly, thaiNow } from "@/lib/time";

export default async function DashboardPage() {
  const user = await requireUser();
  const today = dateOnly(thaiNow().date);
  const [employees, records, wages] = await Promise.all([
    prisma.employee.count({ where: { status: "ACTIVE" } }),
    prisma.attendanceRecord.findMany({ where: { date: today } }),
    prisma.wageCalculation.aggregate({ where: { date: today }, _sum: { netWage: true } })
  ]);
  const cards = [
    ["พนักงาน", employees],
    ["มาทำงานวันนี้", records.length],
    ["มาสาย/ผิดเวลา", records.filter((item) => item.statusLabel.includes("สาย") || item.statusLabel.includes("ออกก่อน")).length],
    ["ค่าแรงวันนี้", `${Number(wages._sum.netWage ?? 0).toLocaleString("th-TH")} บาท`]
  ];
  return (
    <AppShell user={user} title="แดชบอร์ด">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <article key={label} className="rounded-lg border border-stone-200 bg-white p-4 shadow-soft">
            <p className="text-sm text-stone-500">{label}</p>
            <strong className="text-3xl font-black">{value}</strong>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
