import { Arguments, CommandBuilder } from "yargs";
import { setConfig } from "../utils/config";
import { Config } from "../types";
import { coerceFolder } from "../utils/path";

export const command =
  "setConfig [dir] [compileScript] [buildScript] [customScript]";
export const describe = "update config values";

export const builder: CommandBuilder<Partial<Config>, Partial<Config>> = (
  yargs
) =>
  yargs
    .positional("dir", {
      type: "string",
      demandOption: false,
      describeribe:
        "Main Work directory under which you store all your projects",
      coerce: coerceFolder,
    })
    .positional("compileScript", {
      type: "string",
      demandOption: false,
      describeribe: "Compile script to run before copy",
      defaults: "npm run compile",
    })
    .positional("buildScript", {
      type: "string",
      demandOption: false,
      describeribe: "Build script to run before copy",
      defaults: "npm run build",
    })
    .positional("customScript", {
      type: "string",
      demandOption: false,
      describeribe: "Custom script to run before copy",
    });

export const handler = (argv: Arguments<Partial<Config>>) => {
  const { dir, buildScript, compileScript, customScript } = argv;
  setConfig({ dir, compileScript, buildScript, customScript });
};
