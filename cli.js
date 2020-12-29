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

const initBuilder = command =>
    command.positional('mainDir', {
        describe: 'Main Dir',
        coerce: coerceFolder,
    });

const initHandler = ({ mainDir }) => init(mainDir);

yargs.command('init <mainDir>', false, initBuilder, initHandler).parse();

const copyBuilder = command => {
    const homedir = os.homedir();
    const configPath = `${homedir}/.package-cli-config.json`;
    if (!fs.pathExistsSync(configPath) || !fs.readJsonSync(configPath).inited) {
        throw new Error('package-cli hasnt been configed yet, please run init');
    }

    return command;
};

const copyHandler = () => copyPackage();

yargs.command('copy', false, copyBuilder, copyHandler).parse();
