declare module "node:sqlite" {
  export class DatabaseSync {
    constructor(path: string);
    prepare(sql: string): {
      get(...values: unknown[]): Record<string, unknown> | undefined;
    };
    close(): void;
  }
}
