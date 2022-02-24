export type Config = {
  dir: string;
  compileScript?: string;
  buildScript?: string;
  customScript?: string;
};

export type CommonArgs = {
  compile?: string | boolean;
  build?: string | boolean;
  custom?: string | boolean;
};

export type Copy = {
  watch?: boolean;
} & CommonArgs;

export type Install = {
  packageName: string;
} & CommonArgs;
