const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const {
  id,
  now,
  load,
  save,
  publicUser,
  audit,
  recalculateAttendance,
  thaiDateParts,
  autoCloseOpenAttendance
} = require("./store");
const {
  hashPassword,
  verifyPassword,
  isAdminRole,
  makeSession,
  sessionCookie,
  clearSessionCookie
} = require("./auth");

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const APP_ENV = process.env.APP_ENV || "production";
const APP_LABEL = process.env.APP_LABEL || (APP_ENV === "production" ? "PRODUCTION" : APP_ENV.toUpperCase());

function send(res, status, payload, headers = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    ...headers
  });
  res.end(body);
}

function sendError(res, status, message) {
  send(res, status, { error: message });
}

function parseCookies(req) {
  return Object.fromEntries(
    String(req.headers.cookie || "")
      .split(";")
      .map((part) => part.trim().split("="))
      .filter((part) => part.length === 2)
  );
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("ข้อมูลใหญ่เกินไป"));
      }
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("รูปแบบ JSON ไม่ถูกต้อง"));
      }
    });
  });
}

function getCurrentUser(req, data) {
  const sessionId = parseCookies(req).session_id;
  if (!sessionId) return null;
  const session = data.sessions.find((item) => item.id === sessionId);
  if (!session || new Date(session.expiresAt).getTime() < Date.now()) return null;
  const user = data.users.find((item) => item.id === session.userId && item.active);
  return user || null;
}

function requireUser(req, res, data) {
  const user = getCurrentUser(req, data);
  if (!user) {
    sendError(res, 401, "กรุณาเข้าสู่ระบบ");
    return null;
  }
  return user;
}

function requireAdmin(req, res, data) {
  const user = requireUser(req, res, data);
  if (!user) return null;
  if (!isAdminRole(user.role)) {
    sendError(res, 403, "บัญชีนี้ไม่มีสิทธิ์ตั้งค่าระบบ");
    return null;
  }
  return user;
}

function pick(input, fields) {
  return Object.fromEntries(fields.map((field) => [field, input[field]]).filter(([, value]) => value !== undefined));
}

function filterByQuery(items, query, fields) {
  const text = String(query.get("q") || "").trim().toLowerCase();
  if (!text) return items;
  return items.filter((item) => fields.some((field) => String(item[field] || "").toLowerCase().includes(text)));
}

function filterDateRange(items, query) {
  const from = query.get("from");
  const to = query.get("to");
  const employeeId = query.get("employeeId");
  return items.filter((item) => {
    if (employeeId && item.employeeId !== employeeId) return false;
    if (from && item.date < from) return false;
    if (to && item.date > to) return false;
    return true;
  });
}

function uniqueAttendance(data, employeeId, date, skipId) {
  return !data.attendanceRecords.some(
    (item) => item.employeeId === employeeId && item.date === date && item.id !== skipId
  );
}

function canClockForEmployee(actor, employeeId) {
  if (["SYSTEM", "Owner", "Manager"].includes(actor.role)) return true;
  return actor.role === "Staff" && actor.employeeId === employeeId;
}

function visibleAttendanceRecords(data, actor, records) {
  if (actor.role !== "Staff") return records;
  return records.filter((item) => item.employeeId === actor.employeeId);
}

async function handleApi(req, res, url) {
  const data = load();
  const route = url.pathname.replace(/^\/api\/?/, "");

  if (route === "login" && req.method === "POST") {
    const body = await readBody(req);
    const user = data.users.find((item) => item.username === body.username && item.active);
    if (!user || !verifyPassword(String(body.password || ""), user.passwordHash)) {
      return sendError(res, 401, "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
    }
    const session = makeSession(user.id);
    data.sessions.push(session);
    audit(data, user, "LOGIN", "users", user.id);
    save(data);
    return send(res, 200, { user: publicUser(user) }, { "Set-Cookie": sessionCookie(session.id) });
  }

  if (route === "logout" && req.method === "POST") {
    const sessionId = parseCookies(req).session_id;
    data.sessions = data.sessions.filter((item) => item.id !== sessionId);
    save(data);
    return send(res, 200, { ok: true }, { "Set-Cookie": clearSessionCookie() });
  }

  if (route === "me" && req.method === "GET") {
    const user = getCurrentUser(req, data);
    return send(res, 200, { user: publicUser(user) });
  }

  if (route === "app-config" && req.method === "GET") {
    return send(res, 200, {
      appEnv: APP_ENV,
      appLabel: APP_LABEL,
      isTest: APP_ENV !== "production"
    });
  }

  const actor = requireUser(req, res, data);
  if (!actor) return;
  const autoClosed = autoCloseOpenAttendance(data, actor);
  if (autoClosed.length) save(data);

  if (route === "dashboard" && req.method === "GET") {
    const today = thaiDateParts().date;
    const todayRecords = data.attendanceRecords.filter((item) => item.date === today);
    const todayWages = data.wageCalculations.filter((item) => item.date === today);
    return send(res, 200, {
      employees: data.employees.filter((item) => item.status === "กำลังทำงาน").length,
      attendedToday: todayRecords.length,
      lateToday: todayRecords.filter((item) => item.status.includes("สาย")).length,
      wageToday: todayWages.reduce((sum, item) => sum + Number(item.netWage || 0), 0)
    });
  }

  if (route === "users") {
    const admin = requireAdmin(req, res, data);
    if (!admin) return;
    if (req.method === "GET") return send(res, 200, { users: data.users.map(publicUser) });
    const body = await readBody(req);
    if (req.method === "POST") {
      if (!body.username || !body.password || !body.role) return sendError(res, 400, "กรุณากรอกชื่อผู้ใช้ รหัสผ่าน และ role");
      if (data.users.some((item) => item.username === body.username)) return sendError(res, 409, "ชื่อผู้ใช้นี้มีอยู่แล้ว");
      const created = {
        id: id(),
        username: body.username,
        passwordHash: hashPassword(String(body.password)),
        role: body.role,
        employeeId: body.employeeId || null,
        active: body.active !== false,
        createdAt: now(),
        updatedAt: now()
      };
      data.users.unshift(created);
      audit(data, admin, "CREATE", "users", created.id, publicUser(created));
      save(data);
      return send(res, 201, { user: publicUser(created) });
    }
  }

  const userMatch = route.match(/^users\/([^/]+)$/);
  if (userMatch) {
    const admin = requireAdmin(req, res, data);
    if (!admin) return;
    const target = data.users.find((item) => item.id === userMatch[1]);
    if (!target) return sendError(res, 404, "ไม่พบผู้ใช้งาน");
    if (req.method === "PUT") {
      const body = await readBody(req);
      Object.assign(target, pick(body, ["username", "role", "employeeId", "active"]), { updatedAt: now() });
      if (body.password) target.passwordHash = hashPassword(String(body.password));
      audit(data, admin, "UPDATE", "users", target.id, publicUser(target));
      save(data);
      return send(res, 200, { user: publicUser(target) });
    }
    if (req.method === "DELETE") {
      if (target.id === admin.id) return sendError(res, 400, "ไม่สามารถลบบัญชีที่กำลังใช้งานอยู่");
      data.users = data.users.filter((item) => item.id !== target.id);
      audit(data, admin, "DELETE", "users", target.id);
      save(data);
      return send(res, 200, { ok: true });
    }
  }

  if (route === "employees") {
    if (req.method === "GET") {
      const items = filterByQuery(data.employees, url.searchParams, ["firstName", "lastName", "phone", "lineId", "position"]);
      return send(res, 200, { employees: items });
    }
    const body = await readBody(req);
    if (req.method === "POST") {
      if (!body.firstName || !body.lastName) return sendError(res, 400, "กรุณากรอกชื่อและนามสกุล");
      const created = {
        id: id(),
        ...pick(body, ["firstName", "lastName", "gender", "age", "address", "phone", "lineId", "position", "startDate", "status"]),
        status: body.status || "กำลังทำงาน",
        createdAt: now(),
        updatedAt: now()
      };
      data.employees.unshift(created);
      data.wageSettings.unshift({ id: id(), employeeId: created.id, dailyWage: Number(body.dailyWage || 0), active: true, createdAt: now(), updatedAt: now() });
      audit(data, actor, "CREATE", "employees", created.id, created);
      save(data);
      return send(res, 201, { employee: created });
    }
  }

  const employeeMatch = route.match(/^employees\/([^/]+)$/);
  if (employeeMatch) {
    const target = data.employees.find((item) => item.id === employeeMatch[1]);
    if (!target) return sendError(res, 404, "ไม่พบพนักงาน");
    if (req.method === "GET") return send(res, 200, { employee: target });
    if (req.method === "PUT") {
      const body = await readBody(req);
      Object.assign(target, pick(body, ["firstName", "lastName", "gender", "age", "address", "phone", "lineId", "position", "startDate", "status"]), { updatedAt: now() });
      audit(data, actor, "UPDATE", "employees", target.id, target);
      save(data);
      return send(res, 200, { employee: target });
    }
    if (req.method === "DELETE") {
      data.employees = data.employees.filter((item) => item.id !== target.id);
      audit(data, actor, "DELETE", "employees", target.id);
      save(data);
      return send(res, 200, { ok: true });
    }
  }

  if (route === "attendance-rules") {
    if (req.method === "GET") return send(res, 200, { rules: data.attendanceRules });
    const admin = requireAdmin(req, res, data);
    if (!admin) return;
    const body = await readBody(req);
    if (req.method === "POST") {
      const created = {
        id: id(),
        label: body.label,
        fromTime: body.fromTime,
        toTime: body.toTime || null,
        deduction: Number(body.deduction || 0),
        noPay: Boolean(body.noPay),
        description: body.description || "",
        active: body.active !== false,
        createdAt: now(),
        updatedAt: now()
      };
      data.attendanceRules.push(created);
      data.attendanceRecords.forEach((record) => recalculateAttendance(data, record));
      audit(data, admin, "CREATE", "attendance_rules", created.id, created);
      save(data);
      return send(res, 201, { rule: created });
    }
  }

  const ruleMatch = route.match(/^attendance-rules\/([^/]+)$/);
  if (ruleMatch) {
    const admin = requireAdmin(req, res, data);
    if (!admin) return;
    const target = data.attendanceRules.find((item) => item.id === ruleMatch[1]);
    if (!target) return sendError(res, 404, "ไม่พบกฎเวลาเข้างาน");
    if (req.method === "PUT") {
      const body = await readBody(req);
      Object.assign(target, pick(body, ["label", "fromTime", "toTime", "description", "active"]), {
        deduction: Number(body.deduction || 0),
        noPay: Boolean(body.noPay),
        updatedAt: now()
      });
      data.attendanceRecords.forEach((record) => recalculateAttendance(data, record));
      audit(data, admin, "UPDATE", "attendance_rules", target.id, target);
      save(data);
      return send(res, 200, { rule: target });
    }
    if (req.method === "DELETE") {
      data.attendanceRules = data.attendanceRules.filter((item) => item.id !== target.id);
      data.attendanceRecords.forEach((record) => recalculateAttendance(data, record));
      audit(data, admin, "DELETE", "attendance_rules", target.id);
      save(data);
      return send(res, 200, { ok: true });
    }
  }

  if (route === "leave-types") {
    if (req.method === "GET") return send(res, 200, { leaveTypes: data.leaveTypes });
    const admin = requireAdmin(req, res, data);
    if (!admin) return;
    const body = await readBody(req);
    if (req.method === "POST") {
      const created = { id: id(), name: body.name, paid: Boolean(body.paid), createdAt: now(), updatedAt: now() };
      data.leaveTypes.push(created);
      audit(data, admin, "CREATE", "leave_types", created.id, created);
      save(data);
      return send(res, 201, { leaveType: created });
    }
  }

  if (route === "thai-time" && req.method === "GET") {
    return send(res, 200, { now: thaiDateParts(), timezone: "Asia/Bangkok" });
  }

  if (route === "staff-clock-status" && req.method === "GET") {
    const employeeId = url.searchParams.get("employeeId") || actor.employeeId;
    if (!employeeId) return sendError(res, 400, "กรุณาผูกบัญชีผู้ใช้งานกับพนักงานก่อน");
    if (!canClockForEmployee(actor, employeeId)) return sendError(res, 403, "ไม่มีสิทธิ์เช็คเวลาของพนักงานคนนี้");
    const openRecord = data.attendanceRecords
      .filter((item) => item.employeeId === employeeId && item.checkIn && !item.checkOut)
      .sort((a, b) => b.date.localeCompare(a.date))[0] || null;
    const todayText = thaiDateParts().date;
    const todayRecord = data.attendanceRecords.find((item) => item.employeeId === employeeId && item.date === todayText) || null;
    return send(res, 200, { openRecord, todayRecord, autoClosed });
  }

  if (route === "staff-clock" && req.method === "POST") {
    const body = await readBody(req);
    const employeeId = body.employeeId || actor.employeeId;
    const action = body.action;
    if (!employeeId) return sendError(res, 400, "กรุณาผูกบัญชีผู้ใช้งานกับพนักงานก่อน");
    if (!canClockForEmployee(actor, employeeId)) return sendError(res, 403, "ไม่มีสิทธิ์เช็คเวลาของพนักงานคนนี้");

    const thaiNow = thaiDateParts();
    if (action === "check-in") {
      let record = data.attendanceRecords.find((item) => item.employeeId === employeeId && item.date === thaiNow.date);
      if (record?.checkIn) return sendError(res, 409, "วันนี้มีเวลาเข้างานแล้ว");
      if (!record) {
        record = {
          id: id(),
          employeeId,
          date: thaiNow.date,
          checkIn: thaiNow.time,
          checkOut: null,
          checkOutDate: null,
          status: "ทำงาน",
          leaveTypeId: null,
          createdAt: now(),
          updatedAt: now()
        };
        data.attendanceRecords.unshift(record);
      } else {
        record.checkIn = thaiNow.time;
        record.status = "ทำงาน";
        record.updatedAt = now();
      }
      recalculateAttendance(data, record);
      audit(data, actor, "CHECK_IN", "attendance_records", record.id, { checkIn: record.checkIn, date: record.date });
      save(data);
      return send(res, 201, { record });
    }

    if (action === "check-out") {
      const record = data.attendanceRecords
        .filter((item) => item.employeeId === employeeId && item.checkIn && !item.checkOut)
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      if (!record) return sendError(res, 404, "ไม่พบรายการเข้างานที่ยังไม่ออกงาน");
      record.checkOut = thaiNow.time;
      record.checkOutDate = thaiNow.date;
      record.autoClosed = false;
      record.updatedAt = now();
      recalculateAttendance(data, record);
      audit(data, actor, "CHECK_OUT", "attendance_records", record.id, { checkOut: record.checkOut, checkOutDate: record.checkOutDate });
      save(data);
      return send(res, 200, { record });
    }

    return sendError(res, 400, "action ต้องเป็น check-in หรือ check-out");
  }

  if (route === "attendance-records") {
    if (req.method === "GET") return send(res, 200, { records: visibleAttendanceRecords(data, actor, filterDateRange(data.attendanceRecords, url.searchParams)) });
    const body = await readBody(req);
    if (req.method === "POST") {
      if (!body.employeeId || !body.date) return sendError(res, 400, "กรุณาเลือกพนักงานและวันที่");
      if (!canClockForEmployee(actor, body.employeeId)) return sendError(res, 403, "ไม่มีสิทธิ์บันทึกเวลาของพนักงานคนนี้");
      if (!uniqueAttendance(data, body.employeeId, body.date)) return sendError(res, 409, "วันนี้มีบันทึกของพนักงานนี้แล้ว");
      const created = {
        id: id(),
        employeeId: body.employeeId,
        date: body.date,
        checkIn: body.checkIn || null,
        checkOut: body.checkOut || null,
        checkOutDate: body.checkOutDate || body.date,
        status: body.status || "ทำงาน",
        leaveTypeId: body.leaveTypeId || null,
        createdAt: now(),
        updatedAt: now()
      };
      data.attendanceRecords.unshift(created);
      recalculateAttendance(data, created);
      audit(data, actor, "CREATE", "attendance_records", created.id, created);
      save(data);
      return send(res, 201, { record: created });
    }
  }

  const attendanceMatch = route.match(/^attendance-records\/([^/]+)$/);
  if (attendanceMatch) {
    const target = data.attendanceRecords.find((item) => item.id === attendanceMatch[1]);
    if (!target) return sendError(res, 404, "ไม่พบบันทึกเวลา");
    if (!canClockForEmployee(actor, target.employeeId)) return sendError(res, 403, "ไม่มีสิทธิ์แก้ไขเวลาของพนักงานคนนี้");
    if (req.method === "PUT") {
      const body = await readBody(req);
      if (body.employeeId && !canClockForEmployee(actor, body.employeeId)) return sendError(res, 403, "ไม่มีสิทธิ์ย้ายบันทึกไปยังพนักงานคนนี้");
      if (body.employeeId && body.date && !uniqueAttendance(data, body.employeeId, body.date, target.id)) {
        return sendError(res, 409, "วันนี้มีบันทึกของพนักงานนี้แล้ว");
      }
      Object.assign(target, pick(body, ["employeeId", "date", "checkIn", "checkOut", "checkOutDate", "status", "leaveTypeId"]), { updatedAt: now() });
      recalculateAttendance(data, target);
      audit(data, actor, "UPDATE", "attendance_records", target.id, target);
      save(data);
      return send(res, 200, { record: target });
    }
    if (req.method === "DELETE") {
      data.attendanceRecords = data.attendanceRecords.filter((item) => item.id !== target.id);
      data.wageCalculations = data.wageCalculations.filter((item) => item.attendanceRecordId !== target.id);
      audit(data, actor, "DELETE", "attendance_records", target.id);
      save(data);
      return send(res, 200, { ok: true });
    }
  }

  if (route === "wage-settings") {
    if (req.method === "GET") return send(res, 200, { wageSettings: data.wageSettings });
    const admin = requireAdmin(req, res, data);
    if (!admin) return;
    const body = await readBody(req);
    if (req.method === "POST") {
      if (!body.employeeId) return sendError(res, 400, "กรุณาเลือกพนักงาน");
      data.wageSettings.forEach((item) => {
        if (item.employeeId === body.employeeId) item.active = false;
      });
      const created = { id: id(), employeeId: body.employeeId, dailyWage: Number(body.dailyWage || 0), active: true, createdAt: now(), updatedAt: now() };
      data.wageSettings.unshift(created);
      data.attendanceRecords.filter((item) => item.employeeId === body.employeeId).forEach((record) => recalculateAttendance(data, record));
      audit(data, admin, "CREATE", "wage_settings", created.id, created);
      save(data);
      return send(res, 201, { wageSetting: created });
    }
  }

  if (route === "wage-calculations" && req.method === "GET") {
    let calculations = filterDateRange(data.wageCalculations, url.searchParams);
    if (actor.role === "Staff") calculations = calculations.filter((item) => item.employeeId === actor.employeeId);
    const total = calculations.reduce((sum, item) => sum + Number(item.netWage || 0), 0);
    return send(res, 200, { calculations, total });
  }

  if (route === "audit-logs" && req.method === "GET") {
    const admin = requireAdmin(req, res, data);
    if (!admin) return;
    return send(res, 200, { auditLogs: data.auditLogs.slice(0, 200) });
  }

  return sendError(res, 404, "ไม่พบ API ที่เรียกใช้");
}

function serveStatic(req, res, url) {
  const filePath = url.pathname === "/" ? path.join(PUBLIC_DIR, "index.html") : path.join(PUBLIC_DIR, url.pathname);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  fs.readFile(resolved, (error, data) => {
    if (error) {
      fs.readFile(path.join(PUBLIC_DIR, "index.html"), (fallbackError, fallback) => {
        if (fallbackError) {
          res.writeHead(404);
          return res.end("Not found");
        }
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(fallback);
      });
      return;
    }
    const ext = path.extname(resolved);
    const types = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "application/javascript; charset=utf-8"
    };
    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }
    serveStatic(req, res, url);
  } catch (error) {
    sendError(res, 500, error.message || "เกิดข้อผิดพลาดในระบบ");
  }
});

function runAutoCloseJob() {
  const data = load();
  const closed = autoCloseOpenAttendance(data);
  if (closed.length) save(data);
}

setInterval(runAutoCloseJob, 60 * 1000);
runAutoCloseJob();

server.listen(PORT, () => {
  console.log(`Restaurant management app running at http://localhost:${PORT}`);
});
