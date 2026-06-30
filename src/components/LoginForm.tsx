"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const demos = [
  ["owner", "owner1234", "Owner"],
  ["system", "system1234", "SYSTEM"],
  ["staff01", "staff1234", "Staff"]
] as const;

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("owner");
  const [password, setPassword] = useState("owner1234");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    setLoading(false);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error ?? "เข้าสู่ระบบไม่สำเร็จ");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="relative w-full rounded-lg border border-white/60 bg-white/90 p-6 shadow-2xl shadow-black/25 backdrop-blur-xl sm:p-7">
      <div className="mb-5 grid gap-2">
        <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-brand">Restaurant OS</span>
        <h2 className="text-3xl font-black">เข้าสู่ระบบ</h2>
        <p className="text-sm text-stone-500">เลือกบัญชีทดลองหรือกรอกบัญชีของคุณ</p>
      </div>
      <div className="grid gap-3">
        <label className="grid gap-1 text-sm font-semibold text-stone-600">
          ชื่อผู้ใช้
          <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-stone-600">
          รหัสผ่าน
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" />
        </label>
        {error ? <div className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</div> : null}
        <button disabled={loading} className="min-h-12 rounded-md bg-brand px-4 font-black text-white hover:bg-brand-dark disabled:opacity-50">
          {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {demos.map(([user, pass, label]) => (
          <button
            key={user}
            type="button"
            onClick={() => {
              setUsername(user);
              setPassword(pass);
            }}
            className="min-h-10 rounded-md border border-stone-200 bg-white text-sm font-bold hover:border-brand hover:text-brand"
          >
            {label}
          </button>
        ))}
      </div>
    </form>
  );
}
