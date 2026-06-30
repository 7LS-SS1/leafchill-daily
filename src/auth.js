const crypto = require("crypto");

const SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const ADMIN_ROLES = new Set(["SYSTEM", "Owner"]);

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, passwordHash) {
  if (!passwordHash || !passwordHash.includes(":")) return false;
  const [salt, storedHash] = passwordHash.split(":");
  const candidate = hashPassword(password, salt).split(":")[1];
  return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(storedHash));
}

function isAdminRole(role) {
  return ADMIN_ROLES.has(role);
}

function makeSession(userId) {
  return {
    id: crypto.randomBytes(24).toString("hex"),
    userId,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString()
  };
}

function sessionCookie(sessionId) {
  return `session_id=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_MS / 1000}`;
}

function clearSessionCookie() {
  return "session_id=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0";
}

module.exports = {
  hashPassword,
  verifyPassword,
  isAdminRole,
  makeSession,
  sessionCookie,
  clearSessionCookie
};
