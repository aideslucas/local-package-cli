/* eslint-disable no-sync */

'use strict';

const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const homedir = os.homedir();

const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

function copyPackage() {
    const rootDir = process.cwd();
    const configPath = path.join(homedir, '.package-cli-config.json');
    const packageJsonPath = path.join(rootDir, 'package.json');

    const pjson = require(packageJsonPath);
    const config = fs.readJsonSync(configPath);

    const { mainDir } = config;
    console.log(`copying package from dir: ${rootDir} to repos inside dir: ${mainDir}`);

    return new Promise((resolve, reject) => {
        const source = path.join(rootDir, 'dist');
        const pname = pjson.name;
        searchPackageRecursive(mainDir)
            .then(resolve)
            .catch(err => {
                reject(err);
            });

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
                        copyDist(path.join(folder, 'node_modules', pname, 'dist'), folderPackageJson.name);
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

        function copyDist(folderPath, pkgName) {
            try {
                fs.copySync(source, folderPath);
                console.log(`dist folder was copied to ${pkgName}`);
            } catch (err) {
                console.error(`failed to copy dist folder to ${pkgName}`);
                reject(err);
            }
        }
    });
}

module.exports = copyPackage;
