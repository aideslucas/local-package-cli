import { Arguments, CommandBuilder } from "yargs";
import { installPackage } from "..";
import { Install } from "../types";
import { getConfig } from "../utils/config";

export const command = "install <packageName> [compile] [build] [custom]";
export const describe =
  "Installs (including dependencies) on the current package a local package found under the configured dir";

export const builder: CommandBuilder<Install, Install> = (yargs) =>
  yargs
    .positional("packageName", {
      type: "string",
      demandOption: true,
      describeribe:
        "The name of the package to install (as describeribed in its package.json)",
    })
    .positional("compile", {
      type: "string",
      alias: "c",
      demandOption: false,
      describeribe:
        "Run compile script on the target package before installing",
    })
    .positional("build", {
      type: "string",
      alias: "b",
      demandOption: false,
      describeribe: "Run build script on the target package before installing",
    })
    .positional("custom", {
      type: "string",
      demandOption: false,
      describeribe: "Run custom script on the target package before installing",
    });

export const handler = (argv: Arguments<Install>) => {
  const { packageName, custom, compile, build } = argv;
  const config = getConfig();
  if (config && config.inited) {
    console.info(`installing package ${packageName}`);
    installPackage(config, { packageName, compile, build, custom });
  } else {
    console.error(
      "local-package-cli hasn't been initiated yet, please run init"
    );
  }
};
