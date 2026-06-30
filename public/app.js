const state = {
  user: null,
  view: "dashboard",
  data: {
    employees: [],
    users: [],
    records: [],
    rules: [],
    wages: [],
    calculations: [],
    leaveTypes: []
  },
  config: {
    appEnv: "production",
    appLabel: "PRODUCTION",
    isTest: false
  },
  calendarDate: new Date()
};

const app = document.querySelector("#app");

const views = [
  ["dashboard", "แดชบอร์ด"],
  ["employees", "พนักงาน"],
  ["attendance", "เข้า-ออกงาน"],
  ["rules", "กฎเวลา"],
  ["wages", "ค่าแรง"],
  ["reports", "รายงาน"],
  ["users", "ผู้ใช้งาน"]
];

function visibleViews() {
  if (state.user?.role === "Staff") return views.filter(([key]) => key === "attendance" || key === "reports");
  return views;
}

function footerViews() {
  const available = visibleViews();
  if (state.user?.role === "Staff") return available;
  const preferred = ["dashboard", "attendance", "employees", "reports", "users"];
  return preferred
    .map((key) => available.find(([viewKey]) => viewKey === key))
    .filter(Boolean);
}

function money(value) {
  return Number(value || 0).toLocaleString("th-TH", { style: "currency", currency: "THB" });
}

function thaiNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    hourCycle: "h23"
  }).formatToParts(new Date());
  const value = (type) => parts.find((part) => part.type === type)?.value;
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    time: `${value("hour")}:${value("minute")}:${value("second")}`,
    compactTime: `${value("hour")}:${value("minute")}`
  };
}

function today() {
  return thaiNow().date;
}

function dateToText(date) {
  return date.toISOString().slice(0, 10);
}

function parseDate(dateText) {
  return new Date(`${dateText}T00:00:00.000Z`);
}

function monthRange(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  return {
    first: dateToText(new Date(Date.UTC(year, month, 1))),
    last: dateToText(new Date(Date.UTC(year, month + 1, 0)))
  };
}

function notify(message) {
  const old = document.querySelector(".notice");
  if (old) old.remove();
  const node = document.createElement("div");
  node.className = "notice";
  node.textContent = message;
  document.body.appendChild(node);
  setTimeout(() => node.remove(), 2800);
}

function testBanner() {
  if (!state.config?.isTest) return "";
  return `<div class="env-banner">${state.config.appLabel} VERSION · ข้อมูลสำหรับทดสอบก่อน production</div>`;
}

async function api(path, options = {}) {
  const response = await fetch(`/api/${path}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    ...options
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "เกิดข้อผิดพลาด");
  return payload;
}

function formData(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  for (const key of Object.keys(data)) {
    if (data[key] === "") data[key] = null;
  }
  return data;
}

function isAdmin() {
  return ["SYSTEM", "Owner"].includes(state.user?.role);
}

function employeeName(id) {
  const employee = state.data.employees.find((item) => item.id === id);
  return employee ? `${employee.firstName} ${employee.lastName}` : "-";
}

function formatCheckOut(record) {
  if (!record.checkOut) return "-";
  const suffix = record.checkOutDate && record.checkOutDate !== record.date ? ` (${record.checkOutDate})` : "";
  const auto = record.autoClosed ? " · อัตโนมัติ" : "";
  return `${record.checkOut}${suffix}${auto}`;
}

function dateTimeMinutes(dateText, timeText) {
  if (!dateText || !timeText) return null;
  const [year, month, day] = dateText.split("-").map(Number);
  const [hour, minute] = timeText.split(":").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day, hour, minute) / 60000);
}

function workDurationMinutes(record, fallbackNow = thaiNow()) {
  if (!record?.date || !record?.checkIn) return null;
  const start = dateTimeMinutes(record.date, record.checkIn);
  const endDate = record.checkOut ? (record.checkOutDate || record.date) : fallbackNow.date;
  const endTime = record.checkOut || fallbackNow.compactTime;
  const end = dateTimeMinutes(endDate, endTime);
  if (start === null || end === null || end < start) return null;
  return end - start;
}

function formatWorkDuration(record, fallbackNow = thaiNow()) {
  const minutes = workDurationMinutes(record, fallbackNow);
  if (minutes === null) return "-";
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours} ชม. ${String(remainder).padStart(2, "0")} นาที`;
}

function renderLogin() {
  app.innerHTML = `
    ${testBanner()}
    <section class="login-page">
      <div class="login-hero">
        <div class="login-kicker">Leaf Chill Daily</div>
        <h1>ระบบจัดการร้านอาหารที่พร้อมเริ่มงานทันที</h1>
        <p>จัดการพนักงาน เช็คเวลาเข้า-ออกงาน คำนวณค่าแรง และดูประวัติย้อนหลังในที่เดียว</p>
        <div class="login-metrics">
          <div><strong>Realtime</strong><span>เวลาไทย</span></div>
          <div><strong>Role</strong><span>สิทธิ์ผู้ใช้</span></div>
          <div><strong>Payroll</strong><span>ค่าแรงอัตโนมัติ</span></div>
        </div>
      </div>
      <form class="login-box" id="loginForm">
        <div class="login-card-head">
          <span class="login-badge">Restaurant OS</span>
          <h2>เข้าสู่ระบบ</h2>
          <p>เลือกบัญชีทดลองหรือกรอกบัญชีของคุณ</p>
        </div>
        <label>ชื่อผู้ใช้<input name="username" autocomplete="username" value="owner" required></label>
        <label>รหัสผ่าน<input name="password" type="password" autocomplete="current-password" value="owner1234" required></label>
        <button class="btn login-submit" type="submit">เข้าสู่ระบบ</button>
        <div class="demo-accounts">
          <button type="button" data-demo-user="owner" data-demo-pass="owner1234">Owner</button>
          <button type="button" data-demo-user="system" data-demo-pass="system1234">SYSTEM</button>
          <button type="button" data-demo-user="staff01" data-demo-pass="staff1234">Staff</button>
        </div>
      </form>
    </section>
  `;
  document.querySelectorAll("[data-demo-user]").forEach((button) => {
    button.addEventListener("click", () => {
      const form = document.querySelector("#loginForm");
      form.elements.username.value = button.dataset.demoUser;
      form.elements.password.value = button.dataset.demoPass;
    });
  });
  document.querySelector("#loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const payload = await api("login", { method: "POST", body: JSON.stringify(formData(event.currentTarget)) });
      state.user = payload.user;
      await loadBaseData();
      renderShell();
    } catch (error) {
      notify(error.message);
    }
  });
}

function renderShell() {
  if (state.user?.role === "Staff" && !["attendance", "reports"].includes(state.view)) state.view = "attendance";
  const menuViews = visibleViews();
  const title = menuViews.find(([key]) => key === state.view)?.[1] || "เข้า-ออกงาน";
  app.innerHTML = `
    ${testBanner()}
    <section class="app-shell">
      <aside class="sidebar">
        <div class="mobile-nav-head">
          <div class="brand">Leaf Chill Daily</div>
          <button class="menu-toggle" id="menuToggle" type="button" aria-expanded="false" aria-controls="mainNav">เมนู</button>
        </div>
        <nav class="nav" id="mainNav">
          ${menuViews.map(([key, label]) => `<button data-view="${key}" class="${state.view === key ? "active" : ""}">${label}</button>`).join("")}
        </nav>
      </aside>
      <section class="content">
        <div class="topbar">
          <div><h1>${title}</h1><span>${state.user.username} · ${state.user.role}</span></div>
          <button class="btn secondary" id="logoutBtn">ออกจากระบบ</button>
        </div>
        <div id="view"></div>
      </section>
      <nav class="mobile-footer-nav">
        ${footerViews().map(([key, label]) => `<button data-view="${key}" class="${state.view === key ? "active" : ""}">${label}</button>`).join("")}
      </nav>
    </section>
  `;
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", async () => {
      state.view = button.dataset.view;
      await loadBaseData();
      renderShell();
    });
  });
  document.querySelector("#menuToggle")?.addEventListener("click", () => {
    const nav = document.querySelector("#mainNav");
    const toggle = document.querySelector("#menuToggle");
    nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(nav.classList.contains("open")));
  });
  document.querySelector("#logoutBtn").addEventListener("click", async () => {
    await api("logout", { method: "POST" });
    state.user = null;
    renderLogin();
  });
  renderView();
}

function renderView() {
  const target = document.querySelector("#view");
  const map = {
    dashboard: renderDashboard,
    employees: renderEmployees,
    attendance: renderAttendance,
    rules: renderRules,
    wages: renderWages,
    reports: renderReports,
    users: renderUsers
  };
  target.innerHTML = map[state.view]();
  bindViewEvents();
}

async function loadBaseData() {
  const [employees, rules, leaveTypes, wages] = await Promise.all([
    api("employees"),
    api("attendance-rules"),
    api("leave-types"),
    api("wage-settings")
  ]);
  state.data.employees = employees.employees;
  state.data.rules = rules.rules;
  state.data.leaveTypes = leaveTypes.leaveTypes;
  state.data.wages = wages.wageSettings;
  if (state.view === "users" && isAdmin()) state.data.users = (await api("users")).users;
  if (state.view === "attendance") {
    const range = monthRange(state.calendarDate);
    state.data.records = (await api(`attendance-records?from=${range.first}&to=${range.last}`)).records;
  }
  if (state.view === "reports") {
    const employeeParam = state.user?.role === "Staff" && state.user.employeeId ? `?employeeId=${state.user.employeeId}` : "";
    state.data.calculations = (await api(`wage-calculations${employeeParam}`)).calculations;
  }
}

function renderDashboard() {
  api("dashboard").then((data) => {
    document.querySelector("#dashStats").innerHTML = `
      <article class="card"><span>พนักงานที่ทำงานอยู่</span><strong>${data.employees}</strong></article>
      <article class="card"><span>มาทำงานวันนี้</span><strong>${data.attendedToday}</strong></article>
      <article class="card"><span>มาสายวันนี้</span><strong>${data.lateToday}</strong></article>
      <article class="card"><span>ค่าแรงรวมวันนี้</span><strong>${money(data.wageToday)}</strong></article>
    `;
  });
  return `
    <section id="dashStats" class="grid stats"></section>
    <section class="panel">
      <h2>งานประจำวัน</h2>
      <p>ใช้เมนูเข้า-ออกงานเพื่อบันทึกเวลา ระบบจะคำนวณสถานะและค่าแรงอัตโนมัติตามกฎที่ตั้งไว้</p>
    </section>
  `;
}

function renderEmployees() {
  return `
    <section class="panel">
      <div class="toolbar">
        <h2>ข้อมูลพนักงาน</h2>
        <input id="employeeSearch" placeholder="ค้นหาชื่อ เบอร์โทร ไลน์ หรือตำแหน่ง" style="max-width:360px">
      </div>
      <form id="employeeForm" class="form-grid">
        <input type="hidden" name="id">
        <label>ชื่อ<input name="firstName" required></label>
        <label>นามสกุล<input name="lastName" required></label>
        <label>เพศ<select name="gender"><option>หญิง</option><option>ชาย</option><option>อื่น ๆ</option></select></label>
        <label>อายุ<input name="age" type="number" min="0"></label>
        <label>เบอร์โทร<input name="phone"></label>
        <label>Line ID<input name="lineId"></label>
        <label>ตำแหน่ง<input name="position"></label>
        <label>วันที่เริ่มงาน<input name="startDate" type="date"></label>
        <label>สถานะ<select name="status"><option>กำลังทำงาน</option><option>ลาออก</option></select></label>
        <label>ค่าแรงรายวัน<input name="dailyWage" type="number" min="0" value="0"></label>
        <label style="grid-column:1/-1">ที่อยู่ / ติดต่อ<textarea name="address"></textarea></label>
        <div class="actions"><button class="btn" type="submit">บันทึกพนักงาน</button><button class="btn secondary" type="reset">ล้างฟอร์ม</button></div>
      </form>
    </section>
    <section class="panel"><div class="table-wrap">${employeeTable(state.data.employees)}</div></section>
  `;
}

function employeeTable(items) {
  if (!items.length) return `<div class="empty">ยังไม่มีข้อมูลพนักงาน</div>`;
  return `
    <table>
      <thead><tr><th>ชื่อ</th><th>ติดต่อ</th><th>ตำแหน่ง</th><th>เริ่มงาน</th><th>สถานะ</th><th></th></tr></thead>
      <tbody>${items.map((item) => `
        <tr>
          <td data-label="ชื่อ"><strong>${item.firstName} ${item.lastName}</strong><br>${item.gender || "-"} · ${item.age || "-"} ปี</td>
          <td data-label="ติดต่อ">${item.phone || "-"}<br>${item.lineId || "-"}</td>
          <td data-label="ตำแหน่ง">${item.position || "-"}</td>
          <td data-label="เริ่มงาน">${item.startDate || "-"}</td>
          <td data-label="สถานะ"><span class="pill">${item.status}</span></td>
          <td data-label="จัดการ" class="actions"><button class="btn secondary" data-edit-employee="${item.id}">แก้ไข</button><button class="btn warn" data-delete-employee="${item.id}">ลบ</button></td>
        </tr>`).join("")}</tbody>
    </table>
  `;
}

function renderAttendance() {
  return `
    <section class="attendance-page">
      <div class="attendance-top">
        ${renderClockPanel()}
        ${renderAttendanceCalendar()}
      </div>
    </section>
    <section class="panel attendance-list">
      <div class="toolbar attendance-toolbar">
        <div>
          <h2>รายการเข้า-ออกงาน</h2>
          <span>${attendanceSummaryText()}</span>
        </div>
        <button class="btn secondary" id="loadToday">โหลดเดือนนี้</button>
      </div>
      <div class="table-wrap">${attendanceTable(state.data.records)}</div>
    </section>
  `;
}

function attendanceSummaryText() {
  const total = state.data.records.length;
  const open = state.data.records.filter((item) => item.checkIn && !item.checkOut).length;
  const early = state.data.records.filter((item) => item.status?.includes("ออกก่อน")).length;
  return `${total} รายการ · กำลังทำงาน ${open} · ออกก่อนเวลา ${early}`;
}

function renderClockPanel() {
  const employeeSelect = state.user?.role === "Staff"
    ? `<input value="${employeeName(state.user.employeeId)}" disabled>`
    : `<select id="clockEmployee">${employeeOptions()}</select>`;
  return `
    <section class="panel clock-panel cf-card">
      <div class="clock-header">
        <div>
          <span class="eyebrow">เวลาประเทศไทย</span>
          <strong id="thaiClock">--:--:--</strong>
          <small id="thaiClockDate">Asia/Bangkok</small>
        </div>
        <span class="status-dot" id="shiftMode">พร้อมใช้งาน</span>
      </div>
      <div class="clock-actions">
        <label>พนักงาน${employeeSelect}</label>
        <div class="shift-grid">
          <div class="work-live">
            <span>ชั่วโมงทำงานจริง</span>
            <strong id="liveWorkDuration">-</strong>
          </div>
          <div class="work-live muted-card">
            <span>รายละเอียดกะ</span>
            <strong id="activeShiftMeta">ยังไม่มีรายการเปิด</strong>
          </div>
        </div>
        <div class="actions">
          <button class="btn clock-btn in" id="autoCheckIn" type="button">เช็คเข้างาน</button>
          <button class="btn clock-btn out" id="autoCheckOut" type="button">เช็คออกงาน</button>
        </div>
        <div id="clockStatus" class="clock-status">กำลังตรวจสอบสถานะ...</div>
      </div>
    </section>
  `;
}

function renderAttendanceCalendar() {
  const date = state.calendarDate;
  const monthName = date.toLocaleDateString("th-TH", { month: "long", year: "numeric", timeZone: "Asia/Bangkok" });
  const todayText = today();
  const selected = parseDate(todayText);
  const dayName = selected.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
  const dayOfYear = Math.floor((selected - new Date(Date.UTC(selected.getUTCFullYear(), 0, 0))) / 86400000);
  const weekNo = Math.ceil(dayOfYear / 7);
  return `
    <section class="calendar-panel compact-calendar">
      <div class="calendar-head">
        <div class="date-badge"><span>${dayName}</span><strong>${selected.getUTCDate()}</strong></div>
        <div><h2>${monthName}</h2><p>Day ${dayOfYear}, Week ${weekNo}<br>Today</p></div>
      </div>
      <div class="calendar-tools">
        <select id="calendarYear">${yearOptions(date.getFullYear())}</select>
        <button class="icon-btn" id="prevMonth" type="button">‹</button>
        <select id="calendarMonth">${monthOptions(date.getMonth())}</select>
        <button class="icon-btn" id="nextMonth" type="button">›</button>
        <button class="btn secondary" id="calendarToday" type="button">Today</button>
      </div>
      <div class="calendar-grid">
        ${["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => `<div class="calendar-weekday">${day}</div>`).join("")}
        ${calendarCells(date)}
      </div>
    </section>
  `;
}

function yearOptions(selectedYear) {
  const years = [];
  for (let year = selectedYear - 3; year <= selectedYear + 3; year++) {
    years.push(`<option value="${year}" ${year === selectedYear ? "selected" : ""}>${year}</option>`);
  }
  return years.join("");
}

function monthOptions(selectedMonth) {
  return Array.from({ length: 12 }, (_, index) => {
    const name = new Date(2026, index, 1).toLocaleDateString("en-US", { month: "short" });
    return `<option value="${index}" ${index === selectedMonth ? "selected" : ""}>${name}</option>`;
  }).join("");
}

function calendarCells(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const first = new Date(Date.UTC(year, month, 1));
  const startOffset = (first.getUTCDay() + 6) % 7;
  const gridStart = new Date(first);
  gridStart.setUTCDate(first.getUTCDate() - startOffset);
  const todayText = today();
  const recordByDate = new Map();
  for (const record of state.data.records) {
    if (!recordByDate.has(record.date)) recordByDate.set(record.date, []);
    recordByDate.get(record.date).push(record);
  }
  return Array.from({ length: 42 }, (_, index) => {
    const cellDate = new Date(gridStart);
    cellDate.setUTCDate(gridStart.getUTCDate() + index);
    const dateText = dateToText(cellDate);
    const inMonth = cellDate.getUTCMonth() === month;
    const records = recordByDate.get(dateText) || [];
    const isToday = dateText === todayText;
    const className = ["calendar-day", inMonth ? "" : "muted", isToday ? "selected" : "", records.length ? "has-record" : ""].join(" ");
    return `<button class="${className}" data-calendar-date="${dateText}" type="button"><span>${cellDate.getUTCDate()}</span>${records.length ? `<small>${records.length} รายการ</small>` : ""}</button>`;
  }).join("");
}

function attendanceTable(items) {
  if (!items.length) return `<div class="empty">ยังไม่มีบันทึกเวลา</div>`;
  return `
    <table class="attendance-table">
      <thead><tr><th>วันที่</th><th>พนักงาน</th><th>เวลา</th><th>ชั่วโมงทำงาน</th><th>สถานะ</th><th></th></tr></thead>
      <tbody>${items.map((item) => `
        <tr>
          <td data-label="วันที่"><strong>${item.date}</strong></td>
          <td data-label="พนักงาน">${employeeName(item.employeeId)}</td>
          <td data-label="เวลา"><span class="time-range">${item.checkIn || "-"} → ${formatCheckOut(item)}</span></td>
          <td data-label="ชั่วโมงทำงาน" data-duration-record="${item.id}">${formatWorkDuration(item)}</td>
          <td data-label="สถานะ">${statusPill(item.status)}</td>
          <td data-label="จัดการ" class="actions"><button class="btn warn" data-delete-attendance="${item.id}">ลบ</button></td>
        </tr>`).join("")}</tbody>
    </table>
  `;
}

function renderRules() {
  const disabled = isAdmin() ? "" : "disabled";
  return `
    <section class="panel">
      <h2>ตั้งค่ากฎการเข้า-ออกงาน</h2>
      <form id="ruleForm" class="form-grid">
        <input type="hidden" name="id">
        <label>ชื่อกฎ<input name="label" required ${disabled}></label>
        <label>ตั้งแต่<input name="fromTime" type="time" required ${disabled}></label>
        <label>ก่อนเวลา<input name="toTime" type="time" ${disabled}></label>
        <label>หักเงิน<input name="deduction" type="number" min="0" value="0" ${disabled}></label>
        <label>ไม่ได้รับค่าแรง<select name="noPay" ${disabled}><option value="false">ไม่ใช่</option><option value="true">ใช่</option></select></label>
        <label style="grid-column:1/-1">คำอธิบาย<input name="description" ${disabled}></label>
        <div class="actions"><button class="btn" ${disabled}>บันทึกกฎ</button><button class="btn secondary" type="reset" ${disabled}>ล้างฟอร์ม</button></div>
      </form>
    </section>
    <section class="panel"><div class="table-wrap">${rulesTable()}</div></section>
  `;
}

function rulesTable() {
  return `
    <table>
      <thead><tr><th>กฎ</th><th>ช่วงเวลา</th><th>หักเงิน</th><th>เงื่อนไข</th><th></th></tr></thead>
      <tbody>${state.data.rules.map((item) => `
        <tr><td data-label="กฎ"><strong>${item.label}</strong><br>${item.description || "-"}</td><td data-label="ช่วงเวลา">${item.fromTime} - ${item.toTime || "เป็นต้นไป"}</td><td data-label="หักเงิน">${money(item.deduction)}</td><td data-label="เงื่อนไข">${item.noPay ? "ไม่ได้รับค่าแรง" : "ได้รับค่าแรง"}</td>
        <td data-label="จัดการ" class="actions">${isAdmin() ? `<button class="btn secondary" data-edit-rule="${item.id}">แก้ไข</button><button class="btn warn" data-delete-rule="${item.id}">ลบ</button>` : "-"}</td></tr>
      `).join("")}</tbody>
    </table>
  `;
}

function renderWages() {
  const disabled = isAdmin() ? "" : "disabled";
  return `
    <section class="panel">
      <h2>ตั้งค่าค่าแรงรายวัน</h2>
      <form id="wageForm" class="form-grid">
        <label>พนักงาน<select name="employeeId" required ${disabled}>${employeeOptions()}</select></label>
        <label>ค่าแรงรายวัน<input name="dailyWage" type="number" min="0" required ${disabled}></label>
        <div class="actions"><button class="btn" ${disabled}>บันทึกค่าแรง</button></div>
      </form>
    </section>
    <section class="panel"><div class="table-wrap">
      <table><thead><tr><th>พนักงาน</th><th>ค่าแรงรายวัน</th><th>สถานะ</th></tr></thead>
      <tbody>${state.data.wages.filter((item) => item.active).map((item) => `<tr><td data-label="พนักงาน">${employeeName(item.employeeId)}</td><td data-label="ค่าแรงรายวัน">${money(item.dailyWage)}</td><td data-label="สถานะ"><span class="pill">ใช้งาน</span></td></tr>`).join("")}</tbody></table>
    </div></section>
  `;
}

function renderReports() {
  return `
    <section class="panel">
      <h2>รายงานค่าแรงย้อนหลัง</h2>
      <form id="reportForm" class="form-grid">
        <label>จากวันที่<input name="from" type="date"></label>
        <label>ถึงวันที่<input name="to" type="date"></label>
        <label>พนักงาน<select name="employeeId"><option value="">ทุกคน</option>${employeeOptions()}</select></label>
        <div class="actions"><button class="btn">ค้นหา</button><button class="btn secondary" type="button" id="exportCsv">Export CSV</button></div>
      </form>
    </section>
    <section class="panel" id="reportPanel">${reportTable(state.data.calculations)}</section>
  `;
}

function reportTable(items) {
  const total = items.reduce((sum, item) => sum + Number(item.netWage || 0), 0);
  if (!items.length) return `<div class="empty">ไม่พบข้อมูลค่าแรง</div>`;
  return `
    <div class="toolbar"><h2>ยอดรวม ${money(total)}</h2></div>
    <div class="table-wrap"><table>
      <thead><tr><th>วันที่</th><th>พนักงาน</th><th>สถานะ</th><th>ค่าแรง</th><th>หัก</th><th>สุทธิ</th></tr></thead>
      <tbody>${items.map((item) => `<tr><td data-label="วันที่">${item.date}</td><td data-label="พนักงาน">${employeeName(item.employeeId)}</td><td data-label="สถานะ">${statusPill(item.status)}</td><td data-label="ค่าแรง">${money(item.baseWage)}</td><td data-label="หัก">${money(item.deduction)}</td><td data-label="สุทธิ"><strong>${money(item.netWage)}</strong></td></tr>`).join("")}</tbody>
    </table></div>
  `;
}

function renderUsers() {
  const disabled = isAdmin() ? "" : "disabled";
  return `
    <section class="panel">
      <h2>จัดการผู้ใช้งานระบบ</h2>
      <form id="userForm" class="form-grid">
        <input type="hidden" name="id">
        <label>Username<input name="username" required ${disabled}></label>
        <label>Password<input name="password" type="password" ${disabled}></label>
        <label>Role<select name="role" ${disabled}><option>SYSTEM</option><option>Owner</option><option>Manager</option><option>Staff</option></select></label>
        <label>ผูกกับพนักงาน<select name="employeeId" ${disabled}><option value="">ไม่ระบุ</option>${employeeOptions()}</select></label>
        <div class="actions"><button class="btn" ${disabled}>บันทึกผู้ใช้</button><button class="btn secondary" type="reset" ${disabled}>ล้างฟอร์ม</button></div>
      </form>
    </section>
    <section class="panel"><div class="table-wrap">
      <table><thead><tr><th>Username</th><th>Role</th><th>พนักงาน</th><th>สถานะ</th><th></th></tr></thead>
      <tbody>${state.data.users.map((item) => `<tr><td data-label="Username">${item.username}</td><td data-label="Role">${item.role}</td><td data-label="พนักงาน">${employeeName(item.employeeId)}</td><td data-label="สถานะ">${item.active ? "ใช้งาน" : "ปิดใช้งาน"}</td><td data-label="จัดการ" class="actions">${isAdmin() ? `<button class="btn secondary" data-edit-user="${item.id}">แก้ไข</button><button class="btn warn" data-delete-user="${item.id}">ลบ</button>` : "-"}</td></tr>`).join("")}</tbody></table>
    </div></section>
  `;
}

function employeeOptions() {
  return state.data.employees.map((item) => `<option value="${item.id}">${item.firstName} ${item.lastName}</option>`).join("");
}

function statusPill(status) {
  const cls = status?.includes("สาย") || status?.includes("ออกก่อน") ? "warn" : status?.includes("ไม่ได้") || status?.includes("ขาด") ? "danger" : "";
  return `<span class="pill ${cls}">${status || "-"}</span>`;
}

function fillForm(formId, data) {
  const form = document.querySelector(formId);
  Object.entries(data).forEach(([key, value]) => {
    if (form.elements[key]) form.elements[key].value = value ?? "";
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function bindViewEvents() {
  const employeeForm = document.querySelector("#employeeForm");
  if (employeeForm) {
    employeeForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = formData(employeeForm);
      const path = data.id ? `employees/${data.id}` : "employees";
      const method = data.id ? "PUT" : "POST";
      await api(path, { method, body: JSON.stringify(data) });
      notify("บันทึกข้อมูลพนักงานแล้ว");
      await loadBaseData();
      renderShell();
    });
    document.querySelector("#employeeSearch").addEventListener("input", async (event) => {
      state.data.employees = (await api(`employees?q=${encodeURIComponent(event.target.value)}`)).employees;
      document.querySelector(".table-wrap").innerHTML = employeeTable(state.data.employees);
      bindViewEvents();
    });
  }

  bindClockPanel();
  bindCalendarPanel();
  bindLiveDurations();

  const ruleForm = document.querySelector("#ruleForm");
  if (ruleForm) {
    ruleForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = formData(ruleForm);
      data.noPay = data.noPay === "true";
      const path = data.id ? `attendance-rules/${data.id}` : "attendance-rules";
      const method = data.id ? "PUT" : "POST";
      await api(path, { method, body: JSON.stringify(data) });
      notify("บันทึกกฎและคำนวณย้อนหลังแล้ว");
      await loadBaseData();
      renderShell();
    });
  }

  const wageForm = document.querySelector("#wageForm");
  if (wageForm) {
    wageForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      await api("wage-settings", { method: "POST", body: JSON.stringify(formData(wageForm)) });
      notify("บันทึกค่าแรงแล้ว");
      await loadBaseData();
      renderShell();
    });
  }

  const reportForm = document.querySelector("#reportForm");
  if (reportForm) {
    reportForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const params = new URLSearchParams(formData(reportForm));
      state.data.calculations = (await api(`wage-calculations?${params}`)).calculations;
      document.querySelector("#reportPanel").innerHTML = reportTable(state.data.calculations);
    });
    document.querySelector("#exportCsv").addEventListener("click", exportCsv);
  }

  const userForm = document.querySelector("#userForm");
  if (userForm) {
    userForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = formData(userForm);
      const path = data.id ? `users/${data.id}` : "users";
      const method = data.id ? "PUT" : "POST";
      await api(path, { method, body: JSON.stringify(data) });
      notify("บันทึกผู้ใช้งานแล้ว");
      await loadBaseData();
      renderShell();
    });
  }

  document.querySelectorAll("[data-edit-employee]").forEach((button) => button.addEventListener("click", () => fillForm("#employeeForm", state.data.employees.find((item) => item.id === button.dataset.editEmployee))));
  document.querySelectorAll("[data-delete-employee]").forEach((button) => button.addEventListener("click", () => removeItem(`employees/${button.dataset.deleteEmployee}`, "ลบพนักงานนี้หรือไม่")));
  document.querySelectorAll("[data-delete-attendance]").forEach((button) => button.addEventListener("click", () => removeItem(`attendance-records/${button.dataset.deleteAttendance}`, "ลบบันทึกเวลานี้หรือไม่")));
  document.querySelectorAll("[data-edit-rule]").forEach((button) => button.addEventListener("click", () => fillForm("#ruleForm", state.data.rules.find((item) => item.id === button.dataset.editRule))));
  document.querySelectorAll("[data-delete-rule]").forEach((button) => button.addEventListener("click", () => removeItem(`attendance-rules/${button.dataset.deleteRule}`, "ลบกฎนี้หรือไม่")));
  document.querySelectorAll("[data-edit-user]").forEach((button) => button.addEventListener("click", () => fillForm("#userForm", state.data.users.find((item) => item.id === button.dataset.editUser))));
  document.querySelectorAll("[data-delete-user]").forEach((button) => button.addEventListener("click", () => removeItem(`users/${button.dataset.deleteUser}`, "ลบผู้ใช้งานนี้หรือไม่")));
}

function selectedClockEmployeeId() {
  if (state.user?.role === "Staff") return state.user.employeeId;
  return document.querySelector("#clockEmployee")?.value;
}

function bindClockPanel() {
  const clock = document.querySelector("#thaiClock");
  if (!clock) return;
  let openRecord = null;

  const renderTime = () => {
    const now = thaiNow();
    clock.textContent = now.time;
    document.querySelector("#thaiClockDate").textContent = new Date().toLocaleDateString("th-TH", {
      timeZone: "Asia/Bangkok",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    const liveDuration = document.querySelector("#liveWorkDuration");
    if (liveDuration) liveDuration.textContent = openRecord ? formatWorkDuration(openRecord, now) : "-";
  };
  renderTime();
  clearInterval(window.__thaiClockInterval);
  window.__thaiClockInterval = setInterval(renderTime, 1000);

  const loadStatus = async () => {
    const employeeId = selectedClockEmployeeId();
    const status = document.querySelector("#clockStatus");
    if (!employeeId) {
      status.textContent = "บัญชี Staff ต้องผูกกับข้อมูลพนักงานก่อน";
      document.querySelector("#autoCheckIn").disabled = true;
      document.querySelector("#autoCheckOut").disabled = true;
      return;
    }
    try {
      const payload = await api(`staff-clock-status?employeeId=${employeeId}`);
      openRecord = payload.openRecord;
      document.querySelector("#autoCheckIn").disabled = Boolean(openRecord);
      document.querySelector("#autoCheckOut").disabled = !openRecord;
      document.querySelector("#shiftMode").textContent = openRecord ? "กำลังทำงาน" : "พร้อมเช็คเข้า";
      document.querySelector("#shiftMode").classList.toggle("active", Boolean(openRecord));
      document.querySelector("#activeShiftMeta").textContent = openRecord
        ? `เข้า ${openRecord.checkIn} · ${openRecord.date}`
        : payload.todayRecord?.checkOut
          ? `ออกล่าสุด ${payload.todayRecord.checkOut} · ${payload.todayRecord.checkOutDate || payload.todayRecord.date}`
          : "ยังไม่มีรายการเปิด";
      status.textContent = openRecord
        ? `กำลังทำงาน: เข้างาน ${openRecord.checkIn} วันที่ ${openRecord.date}`
        : "ยังไม่มีรายการเข้างานที่เปิดอยู่";
      renderTime();
    } catch (error) {
      openRecord = null;
      document.querySelector("#shiftMode").textContent = "ตรวจสอบไม่ได้";
      document.querySelector("#shiftMode").classList.remove("active");
      document.querySelector("#activeShiftMeta").textContent = "-";
      status.textContent = error.message;
      renderTime();
    }
  };

  document.querySelector("#clockEmployee")?.addEventListener("change", loadStatus);
  document.querySelector("#autoCheckIn").addEventListener("click", () => clockAction("check-in"));
  document.querySelector("#autoCheckOut").addEventListener("click", () => clockAction("check-out"));
  loadStatus();
}

async function clockAction(action) {
  const employeeId = selectedClockEmployeeId();
  if (!employeeId) return notify("กรุณาเลือกหรือผูกบัญชีกับพนักงานก่อน");
  try {
    await api("staff-clock", { method: "POST", body: JSON.stringify({ action, employeeId }) });
    notify(action === "check-in" ? "เช็คเข้างานเรียบร้อย" : "เช็คออกงานเรียบร้อย");
    await loadBaseData();
    renderShell();
  } catch (error) {
    notify(error.message);
  }
}

function bindCalendarPanel() {
  const year = document.querySelector("#calendarYear");
  const month = document.querySelector("#calendarMonth");
  if (!year || !month) return;
  const updateMonth = async () => {
    state.calendarDate = new Date(Number(year.value), Number(month.value), 1);
    await loadBaseData();
    renderShell();
  };
  year.addEventListener("change", updateMonth);
  month.addEventListener("change", updateMonth);
  document.querySelector("#prevMonth").addEventListener("click", async () => {
    state.calendarDate = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth() - 1, 1);
    await loadBaseData();
    renderShell();
  });
  document.querySelector("#nextMonth").addEventListener("click", async () => {
    state.calendarDate = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth() + 1, 1);
    await loadBaseData();
    renderShell();
  });
  document.querySelector("#calendarToday").addEventListener("click", async () => {
    const current = parseDate(today());
    state.calendarDate = new Date(current.getUTCFullYear(), current.getUTCMonth(), 1);
    await loadBaseData();
    renderShell();
  });
  document.querySelector("#loadToday")?.addEventListener("click", async () => {
    const range = monthRange(state.calendarDate);
    state.data.records = (await api(`attendance-records?from=${range.first}&to=${range.last}`)).records;
    renderShell();
  });
  document.querySelectorAll("[data-calendar-date]").forEach((button) => {
    button.addEventListener("click", async () => {
      state.data.records = (await api(`attendance-records?from=${button.dataset.calendarDate}&to=${button.dataset.calendarDate}`)).records;
      document.querySelector(".table-wrap").innerHTML = attendanceTable(state.data.records);
      bindViewEvents();
      bindLiveDurations();
    });
  });
}

function bindLiveDurations() {
  clearInterval(window.__durationInterval);
  const update = () => {
    const now = thaiNow();
    for (const record of state.data.records) {
      if (record.checkOut) continue;
      const cell = document.querySelector(`[data-duration-record="${record.id}"]`);
      if (cell) cell.textContent = formatWorkDuration(record, now);
    }
  };
  update();
  window.__durationInterval = setInterval(update, 1000);
}

async function removeItem(path, message) {
  if (!confirm(message)) return;
  await api(path, { method: "DELETE" });
  notify("ลบข้อมูลแล้ว");
  await loadBaseData();
  renderShell();
}

function exportCsv() {
  const rows = [["วันที่", "พนักงาน", "สถานะ", "ค่าแรง", "หัก", "สุทธิ"]];
  state.data.calculations.forEach((item) => rows.push([item.date, employeeName(item.employeeId), item.status, item.baseWage, item.deduction, item.netWage]));
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `wage-report-${today()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

async function boot() {
  state.config = await api("app-config").catch(() => state.config);
  const payload = await api("me");
  state.user = payload.user;
  if (!state.user) return renderLogin();
  await loadBaseData();
  renderShell();
}

boot().catch(() => renderLogin());
