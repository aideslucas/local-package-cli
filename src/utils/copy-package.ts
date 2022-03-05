import fs from "fs-extra";
import path from "path";
import { CommonArgs, CompleteConfig, Config, Install } from "../types";
import { logger } from "./log";
import { execShell, popd, pushd, remove } from "./shell";

function executeScript(
  config: Config,
  args: CommonArgs,
  configKey: keyof Config,
  argsKey: keyof CommonArgs
) {
  if (args[argsKey] || args[argsKey] === "") {
    let script: string;
    if (args[argsKey] === "" && !config[configKey]) {
      logger.error(
        `there is no ${configKey} in config. either set ${configKey} or send the script in the command`
      );
      return false;
    } else {
      script = args[argsKey] === "" ? config[configKey]! : args[argsKey]!;
    }

    logger.debug(`running ${argsKey} script (${script})`);
    const response = execShell(script);
    if (response.code !== 0) {
      logger.error(`${argsKey} script failed to run`);
      return false;
    }

    logger.success(`${argsKey} script ran successfully`);
    return true;
  }
}

function executeScripts(config: Config, args: CommonArgs) {
  const custom = executeScript(config, args, "customScript", "custom");
  const build = executeScript(config, args, "buildScript", "build");
  const compile = executeScript(config, args, "compileScript", "compile");

  return { custom, build, compile };
}

async function searchPackageUsageRecursive(
  pname: string,
  directory: string,
  copyPackageContent: Function
) {
  const folders = await getSubFolders(directory);
  await Promise.all(
    folders.map(async (folder: string) => {
      const pJsonPath = path.join(folder, "package.json");
      const nodeModulesPath = path.join(folder, "node_modules", pname);

      if (fs.pathExistsSync(pJsonPath)) {
        const folderPackageJson = fs.readJsonSync(pJsonPath, { throws: false });
        const {
          dependencies = {},
          peerDependencies = {},
          devDependencies = {},
        } = folderPackageJson || {};
        const deps = {
          ...dependencies,
          ...peerDependencies,
          ...devDependencies,
        };
        if (
          (folderPackageJson && Object.keys(deps).includes(pname)) ||
          fs.pathExistsSync(nodeModulesPath)
        ) {
          await copyPackageContent(
            nodeModulesPath,
            folderPackageJson ? folderPackageJson.name : folder
          );
        }
      }

      await searchPackageUsageRecursive(pname, folder, copyPackageContent);
    })
  );
}

async function getSubFolders(directory: string) {
  const dirs = await fs.readdir(directory, { withFileTypes: true });
  return dirs
    .filter(
      (dirent) =>
        dirent.isDirectory() &&
        !dirent.name.startsWith(".") &&
        dirent.name !== "node_modules"
    )
    .map((dirent) => path.join(directory, dirent.name));
}

async function searchPackageDefinitionRecursive(
  pname: string,
  directory: string
) {
  const folders = await getSubFolders(directory);
  const res: any[] = await Promise.all(
    folders.map(async (folder) => {
      const pJsonPath = path.join(folder, "package.json");
      const exists = fs.pathExistsSync(pJsonPath);
      if (exists) {
        const folderPackageJson = fs.readJsonSync(pJsonPath, { throws: false });
        if (folderPackageJson && folderPackageJson.name === pname) {
          return folder;
        } else if (!folderPackageJson) {
          logger.warn(
            `package.json for folder ${folder} is invalid, skipping it`
          );
        }
      }

      return await searchPackageDefinitionRecursive(pname, folder);
    })
  );

  return res.find((x: any) => !!x);
}

export function copyPackage(
  config: Config,
  { compile, build, custom }: CommonArgs
) {
  const executions = executeScripts(config, { compile, build, custom });
  if (Object.values(executions).some((exec) => exec === false)) {
    return;
  }

  const { dir } = config;
  const pack = execShell("npm pack");

  if (pack.code !== 0) {
    logger.error("pack failed");
    return;
  }

  const lines = pack.output.split("\n");
  const tarName = lines[lines.length - 2];
  const unpack = execShell(`tar -xzf ${tarName}`);

  if (unpack.code !== 0) {
    logger.error("unpack failed, removing tgz");
    remove(tarName);
    return;
  }

  const rootDir = process.cwd();
  const packagePath = path.join(rootDir, "package");
  const packageJsonPath = path.join(rootDir, "package.json");
  const pjson = require(packageJsonPath);
  const pname = pjson.name;

  logger.debug(`copying package ${pname} to repos under: ${dir}`);

  return new Promise((resolve, reject) => {
    async function copyPackageContent(destPath: string, pkgName: string) {
      try {
        try {
          fs.removeSync(destPath);
        } catch (err) {
          logger.error(
            `failed to delete old package content in ${pkgName}`,
            err
          );
        }
        fs.copySync(packagePath, destPath);
        logger.success(`package content folder was copied to ${pkgName}`);
      } catch (err) {
        logger.warn(`failed to copy package content folder to ${pkgName}`);
        reject(err);
      }
    }

    return fs
      .ensureDir(packagePath)
      .then(() => searchPackageUsageRecursive(pname, dir, copyPackageContent))
      .then(resolve)
      .catch((err) => reject(err));
  }).finally(() => {
    try {
      remove([tarName, "package"]);
    } catch (e) {
      logger.warn("could not remove tgz or package folder", e);
    }
  });
}

export async function installPackage(
  config: CompleteConfig,
  { packageName, compile, build, custom }: Install
) {
  const { dir, preferredPackageManager } = config;

  logger.debug(`searching package ${packageName} under ${dir}`);

  const packageFolder = await searchPackageDefinitionRecursive(
    packageName,
    dir
  );

  if (!packageFolder) {
    logger.error(`package not found under ${dir}. cannot install`);
    return;
  }

  pushd(packageFolder);

  const executions = executeScripts(config, { compile, build, custom });
  if (Object.values(executions).some((exec) => exec === false)) {
    return;
  }

  const pack = execShell("npm pack");

  if (pack.code !== 0) {
    logger.error("pack failed");
    return;
  }

  const lines = pack.output.split("\n");
  const tarName = lines[lines.length - 2];

  popd();

  let packageJsonTxt = fs.readFileSync("./package.json", "utf-8");
  let lockFile, installScript;
  if (preferredPackageManager === "yarn") {
    lockFile = "./yarn.lock";
    installScript = "yarn add --no-lockfile";
  } else {
    lockFile = "./package-lock.json";
    installScript = "npm install --no-save";
  }

  let hasLockFile = fs.existsSync(lockFile);
  let lockTxt = hasLockFile ? fs.readFileSync(lockFile, "utf-8") : undefined;
  execShell(`${installScript} ${path.join(packageFolder, tarName)}`);
  fs.writeFileSync("./package.json", packageJsonTxt);
  if (hasLockFile) {
    fs.writeFileSync(lockFile, lockTxt!);
  } else {
    fs.removeSync(lockFile);
  }

  pushd(packageFolder);
  remove(tarName);
  popd();
}
