process.env.APP_ENV = "test";
process.env.APP_LABEL = "TEST";
process.env.PORT = process.env.PORT || "3100";
process.env.DATA_FILE = process.env.DATA_FILE || "data/database.test.json";

require("./server");
