import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="relative grid min-h-svh items-center gap-8 overflow-hidden bg-[linear-gradient(120deg,rgba(6,23,19,.90),rgba(10,38,32,.72),rgba(6,23,19,.94)),url('https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center p-5 lg:grid-cols-[1.1fr_460px] lg:p-16">
      <section className="relative max-w-3xl text-white">
        <div className="mb-4 w-fit rounded-full border border-white/20 bg-white/10 px-3 py-2 text-sm font-black backdrop-blur">Leaf Chill Daily</div>
        <h1 className="text-4xl font-black leading-none sm:text-6xl lg:text-7xl">ระบบจัดการร้านอาหารที่พร้อมเริ่มงานทันที</h1>
        <p className="mt-5 max-w-xl text-base text-white/75 sm:text-lg">จัดการพนักงาน เช็คเวลาเข้า-ออกงาน คำนวณค่าแรง และดูประวัติย้อนหลังในที่เดียว</p>
        <div className="mt-7 grid max-w-xl gap-3 sm:grid-cols-3">
          {[
            ["Realtime", "เวลาไทย"],
            ["Role", "สิทธิ์ผู้ใช้"],
            ["Payroll", "ค่าแรงอัตโนมัติ"]
          ].map(([title, text]) => (
            <div key={title} className="rounded-lg border border-white/20 bg-white/10 p-4 backdrop-blur">
              <strong className="block text-lg">{title}</strong>
              <span className="text-sm text-white/70">{text}</span>
            </div>
          ))}
        </div>
      </section>
      <LoginForm />
    </main>
  );
}
