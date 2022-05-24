export interface CompilerOptions {
}

export function parseCliArguments(args: string[]): [string, CompilerOptions] {
  const freeArguments: string[] = [];
  const namedArguments: { [key: string]: string } = {};

  let curArgumentIndex = 0;
  while (curArgumentIndex < args.length) {
    if (args[curArgumentIndex].startsWith("--")) {
      if (curArgumentIndex === args.length - 1) {
        throw new Error(
          `No value found for named argument: ${args[curArgumentIndex]}`,
        );
      }

      const key = args[curArgumentIndex];
      const value = args[curArgumentIndex + 1];
      namedArguments[key] = value;

      curArgumentIndex += 2;
    } else {
      freeArguments.push(args[curArgumentIndex]);
      curArgumentIndex += 1;
    }
  }

  if (freeArguments.length !== 1) {
    throw new Error(
      `You should provide exactly one free argument - the target source file name. Found: ${freeArguments}`,
    );
  }

  return [freeArguments[0], namedArguments as CompilerOptions];
}
