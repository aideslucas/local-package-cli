/* eslint-disable no-sync */

'use strict';

const fs = require('fs-extra');
const path = require('path');
const os = require('os');

function init(mainDir) {
    const homedir = os.homedir();
    const configPath = path.join(homedir, '.package-cli-config.json');

    fs.ensureFileSync(configPath);
    fs.writeJsonSync(configPath, { mainDir, inited: true });
}

module.exports = init;
