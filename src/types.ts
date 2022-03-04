export type Config = {
  dir: string;
  compileScript?: string;
  buildScript?: string;
  customScript?: string;
};

export type CompleteConfig = Config & {
  preferredPackageManager: "yarn" | "npm";
  inited: boolean;
};

export type CommonArgs = {
  compile?: string;
  build?: string;
  custom?: string;
};

export type Copy = {
  watch?: boolean;
} & CommonArgs;

export type Install = {
  packageName: string;
} & CommonArgs;
