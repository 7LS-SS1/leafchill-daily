"use client";

import { useEffect, useMemo, useState } from "react";

type ClockState = {
  openRecord?: { date: string; checkIn: string | null } | null;
  todayRecord?: { checkOut: string | null; checkOutDate: string | null } | null;
};

function thaiParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}:${get("second")}`
  };
}

function normalizeDate(date?: string) {
  return date?.slice(0, 10);
}

function duration(date?: string, checkIn?: string | null, now?: { date: string; time: string }) {
  const workDate = normalizeDate(date);
  if (!workDate || !checkIn || !now) return "-";
  const start = Date.parse(`${workDate}T${checkIn}:00+07:00`);
  const end = Date.parse(`${now.date}T${now.time}+07:00`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return "-";
  const minutes = Math.floor((end - start) / 60000);
  return `${Math.floor(minutes / 60)} ชม. ${String(minutes % 60).padStart(2, "0")} นาที`;
}

export function ClockPanelNext() {
  const [clock, setClock] = useState(new Date());
  const [state, setState] = useState<ClockState>({});
  const [message, setMessage] = useState("กำลังตรวจสอบสถานะ...");

  const now = useMemo(() => thaiParts(clock), [clock]);

  async function loadStatus() {
    const response = await fetch("/api/clock");
    const payload = await response.json();
    setState(payload);
    setMessage(
      payload.openRecord
        ? `กำลังทำงาน: เข้า ${payload.openRecord.checkIn}`
        : "ยังไม่มีรายการเข้างานที่เปิดอยู่"
    );
  }

  async function clockAction(action: "check-in" | "check-out") {
    const response = await fetch("/api/clock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action })
    });
    const payload = await response.json();
    setMessage(response.ok ? (action === "check-in" ? "เช็คเข้างานเรียบร้อย" : "เช็คออกงานเรียบร้อย") : payload.error);
    await loadStatus();
  }

  useEffect(() => {
    loadStatus();
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const thaiTime = new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).format(clock);
  const thaiDate = new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(clock);
  const workedTime = duration(state.openRecord?.date, state.openRecord?.checkIn, now);

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-stone-500">เวลาประเทศไทย</p>
          <div className="text-5xl font-black tabular-nums sm:text-7xl">{thaiTime}</div>
          <p className="text-sm text-stone-500">{thaiDate}</p>
        </div>
        <span className="rounded-full border border-stone-200 px-3 py-1 text-xs font-black text-brand">
          {state.openRecord ? "กำลังทำงาน" : "พร้อมเช็คเข้า"}
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
          <p className="text-xs font-bold text-stone-500">ชั่วโมงทำงานจริง</p>
          <strong className="text-xl">{workedTime}</strong>
        </div>
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
          <p className="text-xs font-bold text-stone-500">รายละเอียดกะ</p>
          <strong className="text-sm">
            {state.openRecord
              ? `เข้า ${state.openRecord.checkIn}`
              : state.todayRecord?.checkOut
                ? `ออกล่าสุด ${state.todayRecord.checkOut}`
                : "ยังไม่มีรายการเปิด"}
          </strong>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          onClick={() => clockAction("check-in")}
          disabled={Boolean(state.openRecord)}
          className="min-h-12 rounded-md bg-brand font-black text-white disabled:opacity-50"
        >
          เช็คเข้างาน
        </button>
        <button
          onClick={() => clockAction("check-out")}
          disabled={!state.openRecord}
          className="min-h-12 rounded-md bg-ember font-black text-white disabled:opacity-50"
        >
          เช็คออกงาน
        </button>
      </div>
      <p className="mt-3 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-600">{message}</p>
    </section>
  );
}
