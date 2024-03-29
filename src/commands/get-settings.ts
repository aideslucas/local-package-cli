import { CommandBuilder } from "yargs";
import { printConfig } from "../utils/config";

export const command = "getConfig";
export const describe = "Prints the configuration values";
export const builder: CommandBuilder<{}, {}> = (yargs) => yargs;
export const handler = () => {
  printConfig();
};
