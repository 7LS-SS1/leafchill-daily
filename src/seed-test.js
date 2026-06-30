const fs = require("fs");
const path = require("path");

process.env.APP_ENV = "test";
process.env.APP_LABEL = "TEST";
process.env.DATA_FILE = process.env.DATA_FILE || "data/database.test.json";

const { initialData, DATA_FILE } = require("./store");

const data = initialData();
data.meta = {
  environment: "test",
  seededAt: new Date().toISOString(),
  note: "ข้อมูลนี้ใช้สำหรับทดสอบก่อน production"
};

fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
console.log(`Seeded test database: ${DATA_FILE}`);
