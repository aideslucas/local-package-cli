import { Arguments, CommandBuilder } from "yargs";
import { installPackage } from "..";
import { getConfig } from "../utils/config";
import { Install } from "../types";

export const command = "install <packageName> [compile] [build] [custom]";
export const desc =
  "Installs (including dependencies) on the current package a local package found under the configured dir";

export const builder: CommandBuilder<Install, Install> = (yargs) =>
  yargs
    .positional("packageName", {
      type: "string",
      demandOption: true,
      describe:
        "The name of the package to install (as described in its package.json)",
    })
    .positional("compile", {
      type: "string",
      demandOption: false,
      describe: "Run compile script on the target package before installing",
    })
    .positional("build", {
      type: "string",
      demandOption: false,
      describe: "Run build script on the target package before installing",
    })
    .positional("custom", {
      type: "string",
      demandOption: false,
      describe: "Run custom script on the target package before installing",
    });

export const handler = (argv: Arguments<Install>) => {
  const { packageName, custom, compile, build } = argv;
  const config = getConfig();
  if (config && config.inited) {
    console.info(`installing package ${packageName}`);
    installPackage(config, { packageName, compile, build, custom });
  } else {
    console.error(
      "local-package-cli hasnt been initiated yet, please run init"
    );
    return false;
  }
};
