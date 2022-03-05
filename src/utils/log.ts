import chalk from "chalk";

export const logger = {
  debug: (...args: any[]) => {
    console.debug(chalk.blue(...args));
  },
  info: (...args: any[]) => {
    console.info(chalk.white(...args));
  },
  warn: (...args: any[]) => {
    console.warn(chalk.yellow(...args));
  },
  error: (...args: any[]) => {
    console.error(chalk.red(...args));
  },
  success: (...args: any[]) => {
    console.info(chalk.green(...args));
  },
};
