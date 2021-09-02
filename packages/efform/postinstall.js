const path = require("path");
const fs = require("fs");
try {
  const data = require(path.join(__dirname + "/tmp.json"));

  const meta = {
    isLegacy: data.isLegacy,
    currentVersion: data.currentVersion || "null",
  };

  fs.writeFileSync(
    path.join(process.env.INIT_CWD + "/node_modules/efform/meta.js"),
    'module.exports = ' + JSON.stringify(meta) 
  );

  fs.unlinkSync(path.join(__dirname + "/tmp.json"));
} catch (error) {
  console.error(error);
}