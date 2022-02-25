import fs from "fs-extra";
import path from "path";
import shell, { ExecOutputReturnValue } from "shelljs";
import { CommonArgs, Config, Install } from "../types";

function execShell(script: string) {
  return shell.exec(script, {
    silent: true,
  }) as ExecOutputReturnValue;
}

function executeScript(
  config: Config,
  args: CommonArgs,
  configKey: keyof Config,
  argsKey: keyof CommonArgs
) {
  if (args[argsKey] || args[argsKey] === "") {
    let script: string;
    if (args[argsKey] === "" && !config[configKey]) {
      console.error(
        `there is no ${configKey} in config. either set ${configKey} or send the script in the command`
      );
      return false;
    } else {
      script = args[argsKey] === "" ? config[configKey]! : args[argsKey]!;
    }

    console.info(`running ${argsKey} script (${script})`);
    const response = execShell(script);
    if (response.code !== 0) {
      console.error(`${argsKey} script failed to run`);
      return false;
    }

    console.info(`${argsKey} script ran successfully`);
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
          console.error(
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
    console.error("pack failed");
    return;
  }

  const lines = pack.output.split("\n");
  const tarName = lines[lines.length - 2];
  const unpack = execShell(`tar -xzf ${tarName}`);

  if (unpack.code !== 0) {
    console.error("unpack failed, removing tgz");
    shell.rm(tarName);
    return;
  }

  const rootDir = process.cwd();
  const packagePath = path.join(rootDir, "package");
  const packageJsonPath = path.join(rootDir, "package.json");
  const pjson = require(packageJsonPath);
  const pname = pjson.name;

  console.log(`copying package ${pname} to repos under: ${dir}`);

  return new Promise((resolve, reject) => {
    async function copyPackageContent(destPath: string, pkgName: string) {
      try {
        try {
          fs.removeSync(destPath);
        } catch (err) {
          console.error(
            `failed to delete old package content in ${pkgName}`,
            err
          );
        }
        fs.copySync(packagePath, destPath);
        console.log(`package content folder was copied to ${pkgName}`);
      } catch (err) {
        console.error(`failed to copy package content folder to ${pkgName}`);
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
      shell.rm("-rf", [tarName, "package"]);
    } catch (e) {
      console.error("could not remove tgz or package folder", e);
    }
  });
}

export async function installPackage(
  config: Config,
  { packageName, compile, build, custom }: Install
) {
  const { dir } = config;

  console.log(`searching package ${packageName} under ${dir}`);

  const packageFolder = await searchPackageDefinitionRecursive(
    packageName,
    dir
  );

  if (!packageFolder) {
    console.error(`package not found under ${dir}. cannot install`);
    return;
  }

  shell.pushd(packageFolder);

  const executions = executeScripts(config, { compile, build, custom });
  if (Object.values(executions).some((exec) => exec === false)) {
    return;
  }

  const pack = execShell("npm pack");

  if (pack.code !== 0) {
    console.error("pack failed");
    return;
  }

  const lines = pack.output.split("\n");
  const tarName = lines[lines.length - 2];

  shell.popd();

  let pjsontxt = fs.readFileSync("./package.json", "utf-8");
  let hasPackageLock = fs.existsSync("./package-lock.json");
  let plocktxt = hasPackageLock
    ? fs.readFileSync("./package-lock.json", "utf-8")
    : undefined;
  execShell(`npm install --save ${packageFolder}${path.sep}${tarName}`);
  fs.writeFileSync("./package.json", pjsontxt);
  if (hasPackageLock) {
    fs.writeFileSync("./package-lock.json", plocktxt!);
  } else {
    fs.removeSync("./package-lock.json");
  }

  shell.cd(packageFolder);
  shell.rm(tarName);
}
