# Local-Package-CLI

### This package is used for package related commnad line functions

## How to use?

install this package as global package:
### Using npm:
`npm install -g local-package-cli`
### Using yarn:
`yarn global add local-package-cli`
### Afterwards you will be able to consume it:
`pkg-cli`

## initializing the package:
before you can use the copy functions you will need to initialize the package, to do so run in command line 

`pkg-cli init <dir>`

### init arguments:

* `dir` - the directory where you keep all your repositories, (i.e: ~/dev | C:\dev). the copy function will only search the package in repositories under this directory.

* `compileScript` - [OPTIONAL] the script to run before copy when running `pkg-cli copy --compile`. this defaults to `npm run compile`.

* `buildScript` - [OPTIONAL] the script to run before copy when running `pkg-cli copy --build`. this defaults to `npm run build`.

* `customScript` - [OPTIONAL] the script to run before copy when running `pkg-cli copy --custom`. this doesn't have a default script, if you dont set it you wont be able to run `pkg-cli copy --custom`.

example: `pkg-cli init ~/dev --buildScript 'yarn build' --customScript 'npm run lint && npm run compile:dev'`

## Copy Function
To copy the package to all the repos that require it in package.json, run the command `pkg-cli copy`.
### copy arguments:
* `--compile [script]` - runs the [script] if [script] is not passed, then <compileScript> set durring init phase then runs the copy command
* `--build [script]` - runs the [script] if [script] is not passed, then <buildScript> set durring init phase then runs the copy command
* `--custom [script]` - runs the [script] if [script] is not passed, then <customScript> set durring init phase then runs the copy command

examples:

`pkg-cli copy --compile`

`pkg-cli copy --build --custom 'npm run lint'`

## package config:
after running init you can update its config running `pkg-cli setConfig`

to view the current config you can run `pkg-cli getConfig`

### setConfig arguments:

* `dir` - [OPTIONAL] the directory where you keep all your repositories, (i.e: ~/dev | C:\dev). the copy function will only search the package in repositories under this directory.

* `compileScript` - [OPTIONAL] the script to run before copy when running `pkg-cli copy --compile`. this defaults to `npm run compile`.

* `buildScript` - [OPTIONAL] the script to run before copy when running `pkg-cli copy --build`. this defaults to `npm run build`.

* `customScript` - [OPTIONAL] the script to run before copy when running `pkg-cli copy --custom`. this doesn't have a default script, if you dont set it you wont be able to run `pkg-cli copy --custom`.

example: `pkg-cli setConfig --dir ~/dev --buildScript 'yarn build'`
