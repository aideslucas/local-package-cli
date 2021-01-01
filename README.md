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

`pkg-cli init <mainDir> --compileScript=<compileScript> --customScript=<customScript>`

### init arguments:

* `mainDir` - the directory where you keep all your repositories, (i.e: ~/dev | C:\dev). the copy function will only search the package in repositories under this directory.

* `compileScript` - the script to run before copy when running `pkg-cli compile-copy`. this defaults to `npm run compile`.

* `buildScript` - the script to run before copy when running `pkg-cli build-copy`. this defaults to `npm run build`.

* `customScript` - the script to run before copy when running `pkg-cli custom-copy`. this doesn't have a default script, if you dont set it you wont be able to run `pkg-cli custom-copy`.

example: `pkg-cli init ~/dev --buildScript='yarn build' --customScript='npm run lint && npm run compile:dev'`

## Functions
* `pkg-cli copy` - copies the package in the current dir to node_modules of all the repos that require the current package in their package.json (under <mainDir>)
* `pkg-cli compile-copy` - runs the <compileScript> set durring init phase then runs the copy command
* `pkg-cli build-copy` - runs the <buildScript> set durring init phase then runs the copy command
* `pkg-cli custom-copy` - runs the <customScript> set durring init phase then runs the copy command