import fs from "fs-extra";
import path from "path";
import os from "os";
import { Config } from "../types";

export function initConfig({
  dir,
  compileScript = "npm run compile",
  buildScript = "npm run build",
  customScript,
}: Config) {
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

export function setConfig(options: Config) {
  const homedir = os.homedir();
  const configPath = path.join(homedir, ".local-package-cli-config.json");

  const config = getConfig();

  if (!config) {
    console.error("No config, run init first");
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

export function getConfig() {
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

export function printConfig() {
  const config = getConfig();

  if (!config) {
    console.error("No config, run init first");
    return;
  }

  delete config.inited;
  console.info(config);
  return;
}
