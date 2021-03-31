/* eslint-disable no-sync */
"use strict";
const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const out = require("cli-output");

function initConfig({
  dir,
  compileScript = "npm run compile",
  buildScript = "npm run build",
  customScript,
}) {
  const homedir = os.homedir();
  const configPath = path.join(homedir, ".local-package-cli-config.json");

  fs.ensureFileSync(configPath);
  fs.writeJsonSync(configPath, {
    dir,
    compileScript,
    buildScript,
    customScript,
    inited: true,
  });
}

function setConfig(options) {
  const homedir = os.homedir();
  const configPath = path.join(homedir, ".local-package-cli-config.json");

  const config = getConfig();

  if (!config) {
    out.error("No config, run init first");
    return;
  }

  fs.writeJsonSync(configPath, {
    dir: options.dir || config.dir,
    compileScript: options.compileScript || config.compileScript,
    buildScript: options.buildScript || config.buildScript,
    customScript: options.customScript || config.customScript,
    inited: true,
  });
}

function getConfig() {
  const homedir = os.homedir();
  const configPath = path.join(homedir, ".local-package-cli-config.json");

  fs.ensureFileSync(configPath);

  try {
    const config = fs.readJsonSync(configPath);
    return config;
  } catch (e) {
    return null;
  }
}

function printConfig() {
  const config = getConfig();

  if (!config) {
    out.error("No config, run init first");
    return;
  }

  delete config.inited;
  out.prettyJSON(config);
  return;
}

module.exports = { initConfig, setConfig, getConfig, printConfig };
