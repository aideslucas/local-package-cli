/* eslint-disable no-sync */

'use strict';

const fs = require('fs-extra');
const path = require('path');
const os = require('os');

function init({ mainDir, compileScript = 'npm run compile', buildScript = 'npm run build', customScript }) {
    const homedir = os.homedir();
    const configPath = path.join(homedir, '.local-package-cli-config.json');

    fs.ensureFileSync(configPath);
    fs.writeJsonSync(configPath, { mainDir, compileScript, buildScript, customScript, inited: true });
}

module.exports = init;
