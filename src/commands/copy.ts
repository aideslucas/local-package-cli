import nodemon from "nodemon";
import { Arguments, CommandBuilder } from "yargs";
import { copyPackage } from "..";
import { Copy } from "../types";
import { getConfig } from "../utils/config";
import { logger } from "./../utils/log";

export const command = "copy [compile] [build] [custom] [watch]";
export const describe =
  "Copies the current package (without dependencies) to all packages under the configured work directory where it's installed or required";

export const builder: CommandBuilder<Copy, Copy> = (yargs) =>
  yargs
    .positional("compile", {
      type: "string",
      alias: "c",
      demandOption: false,
      describe: "Run compile script on the current package before copying",
    })
    .positional("build", {
      type: "string",
      alias: "b",
      demandOption: false,
      describe: "Run build script on the current package before copying",
    })
    .positional("custom", {
      type: "string",
      demandOption: false,
      describe: "Run custom script on the current package before copying",
    })
    .positional("watch", {
      type: "boolean",
      alias: "w",
      demandOption: false,
      describe: "Watch current package files and rerun copy on changes",
    });

export const handler = (argv: Arguments<Copy>) => {
  const { watch, custom, compile, build } = argv;
  const config = getConfig();
  if (config && config.initialized) {
    copyPackage(config, { compile, build, custom });
    if (watch) {
      const watchParam = typeof watch === "string" ? watch : ".";
      nodemon(
        `--watch ${watchParam} --ignore *.tgz --ignore package --delay 2`
      );
      nodemon.on("restart", () => {
        copyPackage(config, { compile, build, custom });
      });
    }
  } else {
    logger.error(
      "pkg-cli hasn't been initialized yet, please run 'pkg-cli init'"
    );
  }
};
