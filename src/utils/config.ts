import fs from "fs-extra";
import os from "os";
import path from "path";
import { CompleteConfig, Config } from "../types";
import { logger } from "./log";
import { execShell } from "./shell";

export function initConfig({
  dir,
  compileScript,
  buildScript,
  customScript,
}: Config) {
  const homedir = os.homedir();
  const configPath = path.join(homedir, ".local-package-cli-config.json");
  const preferredPackageManager =
    execShell("yarn --version").code === 0 ? "yarn" : "npm";

  fs.ensureFileSync(configPath);
  fs.writeJsonSync(configPath, {
    dir,
    compileScript: compileScript || `${preferredPackageManager} run compile`,
    buildScript: buildScript || `${preferredPackageManager} run build`,
    customScript,
    initialized: true,
    preferredPackageManager,
  } as CompleteConfig);
}

export function setConfig(options: Partial<Config>) {
  const homedir = os.homedir();
  const configPath = path.join(homedir, ".local-package-cli-config.json");

  const config = getConfig();

  if (!config) {
    logger.error("No config, run init first");
    return;
  }

  fs.writeJsonSync(configPath, {
    dir: options.dir || config.dir,
    compileScript: options.compileScript || config.compileScript,
    buildScript: options.buildScript || config.buildScript,
    customScript: options.customScript || config.customScript,
    initialized: true,
    preferredPackageManager: config.preferredPackageManager,
  } as CompleteConfig);
}

export function getConfig() {
  const homedir = os.homedir();
  const configPath = path.join(homedir, ".local-package-cli-config.json");

  fs.ensureFileSync(configPath);

  try {
    const config = fs.readJsonSync(configPath);
    return config as CompleteConfig;
  } catch (e) {
    return null;
  }
}

export function printConfig() {
  const config = getConfig();

  if (!config) {
    logger.error("No config, run init first");
    return;
  }

  console.info(config);
  return;
}
