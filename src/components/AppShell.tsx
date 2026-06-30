import Link from "next/link";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { clearSession, type AuthUser } from "@/lib/auth";

const allNav = [
  ["แดชบอร์ด", "/dashboard", [Role.SYSTEM, Role.OWNER, Role.MANAGER, Role.STAFF]],
  ["พนักงาน", "/employees", [Role.SYSTEM, Role.OWNER, Role.MANAGER]],
  ["เข้า-ออกงาน", "/attendance", [Role.SYSTEM, Role.OWNER, Role.MANAGER, Role.STAFF]],
  ["กฎเวลา", "/rules", [Role.SYSTEM, Role.OWNER]],
  ["ค่าแรง", "/wages", [Role.SYSTEM, Role.OWNER]],
  ["รายงาน", "/reports", [Role.SYSTEM, Role.OWNER, Role.MANAGER, Role.STAFF]],
  ["ผู้ใช้งาน", "/users", [Role.SYSTEM, Role.OWNER]]
] as const;

export function visibleNav(role: Role) {
  return allNav.filter(([, , roles]) => (roles as readonly Role[]).includes(role));
}

export function AppShell({ user, title, children }: { user: AuthUser; title: string; children: React.ReactNode }) {
  const nav = visibleNav(user.role);
  const footerNav = user.role === Role.STAFF ? nav : nav.filter(([, href]) => ["/dashboard", "/attendance", "/employees", "/reports", "/users"].includes(href));

  async function logout() {
    "use server";
    await clearSession();
    redirect("/login");
  }

  return (
    <section className="min-h-svh bg-[#f7f7f2] pb-20 md:grid md:grid-cols-[260px_1fr] md:pb-0">
      <aside className="sticky top-0 z-20 bg-[#102721] p-3 text-white md:min-h-svh md:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-lg font-black md:mb-5 md:text-2xl">Leaf Chill Daily</div>
        </div>
        <nav className="mt-3 hidden gap-2 md:grid">
          {nav.map(([label, href]) => (
            <Link key={href} href={href} className="rounded-md px-3 py-2 text-sm font-bold text-white/80 hover:bg-white/10 hover:text-white">
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="p-3 md:p-6">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black">{title}</h1>
            <p className="text-sm text-stone-500">{user.username} · {user.role}</p>
          </div>
          <form action={logout}>
            <button className="rounded-md bg-white px-3 py-2 text-sm font-bold shadow-sm ring-1 ring-stone-200">ออกจากระบบ</button>
          </form>
        </header>
        {children}
      </main>
      <nav className="fixed inset-x-2 bottom-2 z-30 grid grid-cols-5 gap-1 rounded-2xl border border-stone-200 bg-white/95 p-2 shadow-2xl backdrop-blur md:hidden">
        {footerNav.slice(0, 5).map(([label, href]) => (
          <Link key={href} href={href} className="rounded-xl px-1 py-2 text-center text-[11px] font-black text-stone-500 hover:bg-[#102721] hover:text-white">
            {label}
          </Link>
        ))}
      </nav>
    </section>
  );
}
