import { CompilerOptions, Token } from './types.ts';
import parseArguments from './parseArguments.ts';
import createIterator from './createIterator.ts';
import lex from './lex.ts';
import parse from './parse.ts';

async function main(args: string[]) {
  const [sourceFile]: [string, CompilerOptions] = parseArguments(args);
  const source: string = await Deno.readTextFile(sourceFile);
  const tokens: Token[] = lex(source);
  const tree = parse(createIterator(tokens));
  console.log(tree);
}

main(Deno.args);
