const fs = require("fs");
const path = require("path");
const { initialData, DATA_FILE } = require("./store");

fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
fs.writeFileSync(DATA_FILE, JSON.stringify(initialData(), null, 2));
console.log(`Seeded ${DATA_FILE}`);
