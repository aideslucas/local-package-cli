import { Arguments, CommandBuilder } from "yargs";
import { setConfig } from "../utils/config";
import { Config } from "../types";
import { coerceFolder } from "../utils/path";

export const command =
  "setConfig [dir] [compileScript] [buildScript] [customScript]";
export const desc = "update config values";

export const builder: CommandBuilder<Partial<Config>, Partial<Config>> = (
  yargs
) =>
  yargs
    .positional("dir", {
      type: "string",
      demandOption: false,
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
  setConfig({ dir, compileScript, buildScript, customScript });
};
