const path = require('path');
const fs = require('fs');

const data = JSON.parse(fs.readFileSync(path.join(__dirname + '/tmp.json'), 'utf-8'));
fs.unlinkSync(path.join(__dirname + '/tmp.json'))
fs.writeFileSync(path.join(process.env.INIT_CWD + '/node_modules/efform/meta.js'), 'export const isLegacy = ' + String(data.isLegacy));