#!/usr/bin/env node

/* eslint-disable no-sync */

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const fs = require('fs-extra');
const out = require('cli-output');
const nodemon = require('nodemon');
const { initConfig, setConfig, printConfig, getConfig } = require('./config');
const { copyPackage, installPackage } = require('./copy-package');

const coerceFolder = path => {
    const exists = fs.pathExistsSync(path);
    if (exists) {
        return path;
    }
    throw new Error(`directory ${path} not found`);
};

const configBuilder = command => {
    command.positional('dir', { describe: 'Main Dir', coerce: coerceFolder });
    command.positional('compileScript', { describe: 'Compile script to run before copy', defaults: 'npm run compile' });
    command.positional('buildScript', { describe: 'Build script to run before copy', defaults: 'npm run build' });
    command.positional('customScript', { describe: 'Custom script to run before copy' });
}

const initHandler = ({ dir, compileScript, buildScript, customScript }) =>
    initConfig({ dir, compileScript, buildScript, customScript });
const setHandler = ({ dir, compileScript, buildScript, customScript }) => setConfig({ dir, compileScript, buildScript, customScript });
const getHandler = () => printConfig();

const copyBuilder = command => {
    command.positional('compile', { describe: 'run compile script before copy' });
    command.positional('build', { describe: 'run build script before copy' });
    command.positional('custom', { describe: 'run custom script before copy' });
    command.positional('watch', { describe: 'watch files and rerun copy on changes' });
};

const copyHandler = ({ compile, build, custom, watch }) => {
    const config = getConfig();
    if (config && config.inited) {
        copyPackage(config, { compile, build, custom });
        if (watch) {
            const watchParam = typeof watch === 'string' ? watch : '.';
            nodemon(`--watch ${watchParam} --ignore *.tgz --ignore package --delay 2`);
            nodemon.on('restart', (files) => {
                console.log('nodemon restart files: ', files);
                copyPackage(config, { compile, build, custom }); 
            });
        }
    } else {
        out.error('local-package-cli hasnt been initiated yet, please run init');
        return false;
    }
}


const installBuilder = command => {
    command.positional(
        'packageName', 
        { 
            describe: 'the name of the package you would want to install (as described in package.json)' 
        }
    );
    command.positional('compile', { describe: 'run compile script on package before installing' });
    command.positional('build', { describe: 'run build script on package before installing' });
    command.positional('custom', { describe: 'run custom script on package before installing' });
};

const installHandler = ({ packageName, compile, build, custom }) => {
    const config = getConfig();
    if (config && config.inited) {
        installPackage(config, { packageName, compile, build, custom });
    } else {
        out.error('local-package-cli hasnt been initiated yet, please run init');
        return false;
    }
}

yargs(hideBin(process.argv))
    .command(
        'init <dir> [compileScript] [buildScript] [customScript]',
        'initiates the package',
        configBuilder,
        initHandler
    )
    .command(
        'setConfig [dir] [compileScript] [buildScript] [customScript]',
        'set some config values after init',
        configBuilder,
        setHandler
    )
    .command(
        'getConfig',
        'gets the config values',
        () => {},
        getHandler
    )
    .command(
        'copy [compile] [build] [custom] [watch]',
        'copy the package to all repos under the configured dir.',
        copyBuilder,
        copyHandler
    )
    .command(
        'install <packageName> [compile] [build] [custom]',
        'installs a single package found locally under the configured dir.',
        installBuilder,
        installHandler
    )
    .argv;