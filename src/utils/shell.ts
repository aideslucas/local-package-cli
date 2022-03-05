import shell, { ExecOutputReturnValue } from "shelljs";

export function execShell(script: string) {
  return shell.exec(script, {
    silent: true,
  }) as ExecOutputReturnValue;
}

export function remove(path: string | string[]) {
  shell.rm("-rf", Array.isArray(path) ? path : [path]);
}

export function pushd(path: string) {
  shell.pushd(path);
}

export function popd() {
  shell.popd();
}
