import fs from "fs-extra";
import os from "os";
import path from "path";

export const coerceFolder = (path: string) => {
  const exists = fs.pathExistsSync(path);
  if (exists) {
    return path;
  }
  throw new Error(`directory ${path} not found`);
};

export const createTempDir = (prefix: string) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  return tmpDir;
};
