const path = require('path');
const fs = require('fs');

const data = JSON.parse(fs.readFileSync(path.join(__dirname + '/tmp.json'), 'utf-8'));
fs.unlinkSync(path.join(__dirname + '/tmp.json'))
const meta = {
	isLegacy: data.isLegacy,
	version: data.version
};

fs.writeFileSync(path.join(process.env.INIT_CWD + '/node_modules/efform/meta.js'), JSON.stringify(meta));