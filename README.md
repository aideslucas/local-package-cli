# Package-CLI

This package is used for package related commnad line functions

## How to use?

install this package as global package running `npm install --global @playbuzz/package-cli`

after installation, run in command line `package-cli init <mainDir>`, <mainDir> should be your main workspace directory, (i.e: ~/dev | C:\dev) 

### Functions
* `package-cli copy` - copies content of the /dist folder of the current dir to node_modules of all the repos who uses the package (under the main workspace directory)
