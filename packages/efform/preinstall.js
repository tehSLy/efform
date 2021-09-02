const fs = require('fs');
const path = require('path');

const contents = fs.readFileSync(path.join(process.env.INIT_CWD + '/package.json'), 'utf8');
fs.writeFileSync(path.join(__dirname + '/tmp.json'), JSON.stringify({
	isLegacy: false
}));
