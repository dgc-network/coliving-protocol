type Options = { skipRollover: boolean }

export class SanityChecks {
  libs: any
  options: Options

  constructor(libsInstance: any, options?: Options): void
  async run(contentNodeWhitelist: string[] | null): Promise<void>
}
