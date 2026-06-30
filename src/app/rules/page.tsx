import { Role } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { SubmitButton } from "@/components/SubmitButton";
import { createRule } from "@/app/actions";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function RulesPage() {
  const user = await requireRole([Role.SYSTEM, Role.OWNER]);
  const rules = await prisma.attendanceRule.findMany({ orderBy: { fromTime: "asc" } });
  return (
    <AppShell user={user} title="กฎเวลา">
      <section className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <form action={createRule} className="rounded-lg border border-stone-200 bg-white p-4 shadow-soft">
          <h2 className="mb-3 text-lg font-black">เพิ่มกฎเวลา</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-bold">ชื่อกฎ<input name="label" required /></label>
            <label className="text-sm font-bold">หักเงิน<input name="deduction" type="number" defaultValue="0" /></label>
            <label className="text-sm font-bold">ตั้งแต่<input name="fromTime" type="time" required /></label>
            <label className="text-sm font-bold">ก่อนเวลา<input name="toTime" type="time" /></label>
            <label className="flex items-center gap-2 text-sm font-bold sm:col-span-2"><input className="w-auto" name="noPay" type="checkbox" /> ไม่ได้รับค่าแรง</label>
            <label className="text-sm font-bold sm:col-span-2">คำอธิบาย<input name="description" /></label>
          </div>
          <div className="mt-3"><SubmitButton>บันทึกกฎ</SubmitButton></div>
        </form>
        <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-soft">
          <h2 className="mb-3 text-lg font-black">กฎที่ใช้งาน</h2>
          <div className="grid gap-2">
            {rules.map((rule) => (
              <div key={rule.id} className="rounded-lg border border-stone-200 p-3">
                <strong>{rule.label}</strong>
                <p className="text-sm text-stone-500">{rule.fromTime} - {rule.toTime ?? "เป็นต้นไป"} · หัก {Number(rule.deduction).toLocaleString("th-TH")} บาท</p>
              </div>
            ))}
          </div>
        </section>
      </section>
    </AppShell>
  );
}
