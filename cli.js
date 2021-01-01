#!/usr/bin/env node

/* eslint-disable no-sync */

const yargs = require('yargs');
const fs = require('fs-extra');
const os = require('os');
const init = require('./init');
const copyPackage = require('./copy-package');

const coerceFolder = path => {
    const exists = fs.pathExistsSync(path);
    if (exists) {
        return path;
    }
    throw new Error(`directory ${path} not found`);
};

const initBuilder = command => {
    command.positional('mainDir', {
        describe: 'Main Dir',
        coerce: coerceFolder,
    });
    
    command.positional('compileScript', { describe: 'Compile script to run before copy', defaults: 'npm run compile' });
    command.positional('buildScript', { describe: 'Build script to run before copy', defaults: 'npm run build' });
    command.positional('customScript', { describe: 'Custom script to run before copy' });
}

const initHandler = ({ mainDir, compileScript, buildScript, customScript }) => init({ mainDir, compileScript, buildScript, customScript });

yargs.command(
    'init <mainDir> --compileScript <compileScript> --buildScript <buildScript> --customScript <customScript>',
    'set initial params for the package to work',
    initBuilder,
    initHandler
).parse();

const copyBuilder = command => {
    const homedir = os.homedir();
    const configPath = `${homedir}/.local-package-cli-config.json`;
    if (!fs.pathExistsSync(configPath) || !fs.readJsonSync(configPath).inited) {
        throw new Error('local-package-cli hasnt been initiated yet, please run init');
    }

    return command;
};

const copyHandler = () => copyPackage();

yargs.command('copy', 'copies the content of the package to the repos using it under <mainDir>', copyBuilder, copyHandler).parse();
