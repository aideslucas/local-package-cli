/* eslint-disable no-sync */
"use strict";
const path = require("path");
const fs = require("fs-extra");
const { promisify } = require("util");
const shell = require("shelljs");
const out = require("cli-output");

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

function executeScripts(
  { customScript, compileScript, buildScript },
  { compile, build, custom }
) {
  if (custom) {
    if (typeof custom === "boolean" && !customScript) {
      out.error(
        "there is no customScript in config. either set customScript or send the script in the command"
      );
      return;
    } else if (typeof custom === "string") {
      shell.exec(custom);
    } else {
      shell.exec(customScript);
    }
  }

  if (compile) {
    if (typeof compile === "boolean" && !compileScript) {
      out.error(
        "there is no compileScript in config. either set compileScript or send the script in the command"
      );
      return;
    } else if (typeof compile === "string") {
      shell.exec(compile);
    } else {
      shell.exec(compileScript);
    }
  }

  if (build) {
    if (typeof build === "boolean" && !buildScript) {
      out.error(
        "there is no buildScript in config. either set buildScript or send the script in the command"
      );
      return;
    } else if (typeof build === "string") {
      shell.exec(build);
    } else {
      shell.exec(buildScript);
    }
  }
}

async function searchPackageUsageRecursive(
  pname,
  directory,
  copyPackageContent
) {
  const nodeVersion = process.version;
  const folders = await (nodeVersion.startsWith("v8")
    ? getSubFoldersV8
    : getSubFolders)(directory);
  await Promise.all(
    folders.map(async (folder) => {
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

async function getSubFoldersV8(dir) {
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
  return files.reduce((a, f) => a.concat(f), []);
}

async function getSubFolders(directory) {
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

async function searchPackageDefinitionRecursive(pname, directory) {
  const nodeVersion = process.version;
  const folders = await (nodeVersion.startsWith("v8")
    ? getSubFoldersV8
    : getSubFolders)(directory);
  const res = await Promise.all(
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

  return res.find((x) => !!x);
}

function copyPackage(config, { compile, build, custom }) {
  executeScripts(config, { compile, build, custom });

  const { dir } = config;
  const pack = shell.exec("npm pack", { silent: true });

  if (pack.code !== 0) {
    out.error("pack failed");
    return;
  }

  const lines = pack.output.split("\n");
  const tarName = lines[lines.length - 2];
  const unpack = shell.exec(`tar -xzf ${tarName}`, { silent: true });

  if (unpack.code !== 0) {
    out.error("unpack failed, removing tgz");
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
    async function copyPackageContent(destPath, pkgName) {
      try {
        out.debug(`copying package to package ${pkgName}`);
        try {
          fs.removeSync(destPath);
        } catch (err) {
          out.log(`failed to delete old package content in ${pkgName}`, err);
        }
        fs.copySync(packagePath, destPath);
        out.log(`package content folder was copied to ${pkgName}`);
      } catch (err) {
        out.error(`failed to copy package content folder to ${pkgName}`);
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
      out.error("could not remove tgz or package folder", e);
    }
  });
}

async function installPackage(config, { packageName, compile, build, custom }) {
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
    out.error("pack failed");
    return;
  }

  const lines = pack.output.split("\n");
  const tarName = lines[lines.length - 2];

  shell.popd();

  let pjsontxt = fs.readFileSync("./package.json", "utf-8");
  let hasPackageLock = fs.existsSync("./package-lock.json");
  let plocktxt =
    hasPackageLock && fs.readFileSync("./package-lock.json", "utf-8");
  shell.exec(`npm install --save ${packageFolder}${path.sep}${tarName}`);
  fs.writeFileSync("./package.json", pjsontxt);
  if (hasPackageLock) {
    fs.writeFileSync("./package-lock.json", plocktxt);
  } else {
    fs.removeSync("./package-lock.json");
  }

  shell.cd(packageFolder);
  shell.rm(tarName);
}

module.exports = { copyPackage, installPackage };
