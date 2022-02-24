import path from "path";
import fs from "fs-extra";
import { promisify } from "util";
import shell from "shelljs";
import { CommonArgs, Config, Install } from "../types";

const readdir = promisify<fs.PathLike, string[]>(fs.readdir);
const stat = promisify<fs.PathLike, fs.Stats>(fs.stat);

function executeScripts(
  { customScript, compileScript, buildScript }: Config,
  { compile, build, custom }: CommonArgs
) {
  if (custom) {
    if (typeof custom === "boolean" && !customScript) {
      console.error(
        "there is no customScript in config. either set customScript or send the script in the command"
      );
      return;
    } else if (typeof custom === "string") {
      shell.exec(custom);
    } else {
      shell.exec(customScript!);
    }
  }

  if (compile) {
    if (typeof compile === "boolean" && !compileScript) {
      console.error(
        "there is no compileScript in config. either set compileScript or send the script in the command"
      );
      return;
    } else if (typeof compile === "string") {
      shell.exec(compile);
    } else {
      shell.exec(compileScript!);
    }
  }

  if (build) {
    if (typeof build === "boolean" && !buildScript) {
      console.error(
        "there is no buildScript in config. either set buildScript or send the script in the command"
      );
      return;
    } else if (typeof build === "string") {
      shell.exec(build);
    } else {
      shell.exec(buildScript!);
    }
  }
}

async function searchPackageUsageRecursive(
  pname: string,
  directory: string,
  copyPackageContent: Function
) {
  const nodeVersion = process.version;
  const folders = await (nodeVersion.startsWith("v8")
    ? getSubFoldersV8
    : getSubFolders)(directory);
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

async function getSubFoldersV8(dir: string) {
  const subdirs = await readdir(dir);
  const files = await Promise.all(
    subdirs.map(async (subdir) => {
      const res = path.resolve(dir, subdir);
      if (
        (await stat(res)).isDirectory() &&
        !subdir.startsWith(".") &&
        subdir !== "node_modules"
      ) {
        return res;
      }
      return null;
    })
  );
  return files.reduce<string[]>((a, f) => a.concat(f ?? ""), []);
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
  const nodeVersion = process.version;
  const folders = await (nodeVersion.startsWith("v8")
    ? getSubFoldersV8
    : getSubFolders)(directory);
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
  executeScripts(config, { compile, build, custom });

  const { dir } = config;
  const pack = shell.exec("npm pack", { silent: true });

  if (pack.code !== 0) {
    console.error("pack failed");
    return;
  }

  const lines = pack.stdout.split("\n");
  const tarName = lines[lines.length - 2];
  const unpack = shell.exec(`tar -xzf ${tarName}`, { silent: true });

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
        console.debug(`copying package to package ${pkgName}`);
        try {
          fs.removeSync(destPath);
        } catch (err) {
          console.log(
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
  executeScripts(config, { compile, build, custom });

  const pack = shell.exec("npm pack", { silent: true });

  if (pack.code !== 0) {
    console.error("pack failed");
    return;
  }

  const lines = pack.stdout.split("\n");
  const tarName = lines[lines.length - 2];

  shell.popd();

  let pjsontxt = fs.readFileSync("./package.json", "utf-8");
  let hasPackageLock = fs.existsSync("./package-lock.json");
  let plocktxt =
    hasPackageLock ? fs.readFileSync("./package-lock.json", "utf-8") : undefined;
  shell.exec(`npm install --save ${packageFolder}${path.sep}${tarName}`);
  fs.writeFileSync("./package.json", pjsontxt);
  if (hasPackageLock) {
    fs.writeFileSync("./package-lock.json", plocktxt!);
  } else {
    fs.removeSync("./package-lock.json");
  }

  shell.cd(packageFolder);
  shell.rm(tarName);
}
