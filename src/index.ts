import { CompilerOptions, parseCliArguments } from "./CliArgumentsParser.ts";
import { compile } from "./lang/Compiler.ts";

async function main(args: string[]) {
  const [mainFile, _options]: [string, CompilerOptions] = parseCliArguments(args);
  const source: string = await Deno.readTextFile(mainFile);
  const result: string = compile(source);
  console.log(result);
}

main(Deno.args);
