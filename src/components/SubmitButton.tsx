"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="min-h-10 rounded-md bg-brand px-4 text-sm font-black text-white hover:bg-brand-dark disabled:opacity-50">
      {pending ? "กำลังบันทึก..." : children}
    </button>
  );
}
