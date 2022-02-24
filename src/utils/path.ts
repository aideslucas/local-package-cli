import fs from "fs-extra";

export const coerceFolder = (path: string) => {
  const exists = fs.pathExistsSync(path);
  if (exists) {
    return path;
  }
  throw new Error(`directory ${path} not found`);
};
