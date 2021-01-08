/* eslint-disable no-sync */

'use strict';

const path = require('path');
const fs = require('fs-extra');
const { promisify } = require('util');
const shell = require('shelljs');
const out = require('cli-output');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

function copyPackage(config, { compile, build, custom }) {
    const { dir, customScript, compileScript, buildScript } = config;
    if (custom) {
        if (typeof custom === 'boolean' && !customScript) {
            out.error('there is no customScript in config. either set customScript or send the script in the command');
            return;
        } else if (typeof custom === 'string') {
            shell.exec(custom);
        } else {
            shell.exec(customScript);
        }
    }

    if (compile) {
        if (typeof compile === 'boolean' && !compileScript) {
            out.error('there is no compileScript in config. either set compileScript or send the script in the command');
            return;
        } else if (typeof compile === 'string') {
            shell.exec(compile);
        } else {
            shell.exec(compileScript);
        }
    }

    if (build) {
        if (typeof build === 'boolean' && !buildScript) {
            out.error('there is no buildScript in config. either set buildScript or send the script in the command');
            return;
        } else if (typeof build === 'string') {
            shell.exec(build);
        } else {
            shell.exec(buildScript);
        }
    }

    const pack = shell.exec('npm pack', { silent: true });

    if (pack.code !== 0) {
        out.error('pack failed');
        return;
    }

    const lines = pack.output.split('\n');
    const tarName = lines[lines.length - 2];
    const unpack = shell.exec(`tar -xzf ${tarName}`, { silent: true });

    if (unpack.code !== 0) {
        out.error('unpack failed, removing tgz');
        shell.rm(tarName);
        return;
    }

    const rootDir = process.cwd();
    const packagePath = path.join(rootDir, 'package');
    const packageJsonPath = path.join(rootDir, 'package.json');
    const pjson = require(packageJsonPath);
    const pname = pjson.name;

    console.log(`copying package ${pname} to repos under: ${dir}`);

    return new Promise((resolve, reject) => {
        searchPackageRecursive(dir).then(resolve).catch(err => reject(err));

        async function searchPackageRecursive(directory) {
            const nodeVersion = process.version;
            const folders = await (nodeVersion.startsWith('v8') ? getSubFoldersV8 : getSubFolders)(directory);
            await Promise.all(folders.map(async folder => {
                const pJsonPath = path.join(folder, 'package.json');
                const exists = fs.pathExistsSync(pJsonPath);
                if (exists) {
                    const folderPackageJson = fs.readJsonSync(pJsonPath, { throws: false });
                    if (folderPackageJson && (
                        Object.keys(folderPackageJson.devDependencies || {}).includes(pname)
                        || Object.keys(folderPackageJson.peerDependencies || {}).includes(pname)
                        || Object.keys(folderPackageJson.dependencies || {}).includes(pname)
                    )) {
                        copyPackageContent(path.join(folder, 'node_modules', pname), folderPackageJson.name);
                    } else if (!folderPackageJson) {
                        console.error(`package.json for folder ${folder} is invalid, skipping it`);
                    }
                }

                await searchPackageRecursive(folder);
            }));
        }

        async function getSubFoldersV8(dir) {
            const subdirs = await readdir(dir);
            const files = await Promise.all(subdirs.map(async subdir => {
                const res = path.resolve(dir, subdir);
                if ((await stat(res)).isDirectory() && !subdir.startsWith('.') && subdir !== 'node_modules') {
                    return res;
                }
                return null;
            }));
            return files.reduce((a, f) => a.concat(f), []);
        }

        async function getSubFolders(directory) {
            const dirs = await fs.readdir(directory, { withFileTypes: true });
            return dirs.filter(dirent =>
                dirent.isDirectory() && !dirent.name.startsWith('.') && dirent.name !== 'node_modules')
                .map(dirent => path.join(directory, dirent.name));
        }

        function copyPackageContent(destPath, pkgName) {
            try {
                fs.copySync(packagePath, destPath);
                out.log(`package content folder was copied to ${pkgName}`);
            } catch (err) {
                out.error(`failed to copy package content folder to ${pkgName}`);
                reject(err);
            }
        }
    }).finally(() => {
        shell.rm(tarName);
        shell.rm('-rf', 'package');
    });
}

module.exports = copyPackage;
