import { Arguments, CommandBuilder } from "yargs";
import { initConfig } from "../utils/config";
import { Config } from "../types";
import { coerceFolder } from "../utils/path";

export const command =
  "init <dir> [compileScript] [buildScript] [customScript]";
export const desc = "Initiates the package for first use";

export const builder: CommandBuilder<Config, Config> = (yargs) =>
  yargs
    .positional("dir", {
      type: "string",
      demandOption: true,
      describe: "Main Work directory under which you store all your projects",
      coerce: coerceFolder,
    })
    .positional("compileScript", {
      type: "string",
      demandOption: false,
      describe: "Compile script to run before copy",
      defaults: "npm run compile",
    })
    .positional("buildScript", {
      type: "string",
      demandOption: false,
      describe: "Build script to run before copy",
      defaults: "npm run build",
    })
    .positional("customScript", {
      type: "string",
      demandOption: false,
      describe: "Custom script to run before copy",
    });

export const handler = (argv: Arguments<Config>) => {
  const { dir, buildScript, compileScript, customScript } = argv;
  initConfig({ dir, compileScript, buildScript, customScript });
};
