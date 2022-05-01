import { CompilerOptions, Token } from './types.ts';
import parseArguments from './parseArguments.ts';
import createIterator from './createIterator.ts';
import lex from './lex.ts';
import parse from './parse.ts';
import Module from './ast/Module.ts';

async function main(args: string[]) {
  const [sourceFile]: [string, CompilerOptions] = parseArguments(args);
  const tree: Module = await compileFile(sourceFile);
  console.log(tree);
}

async function compileFile(sourceFile: string): Promise<Module> {
  const source: string = await Deno.readTextFile(sourceFile);
  const tokens: Token[] = lex(source);
  const tree = parse(createIterator(tokens));
  console.log(JSON.stringify(tree, null, 2));
  return tree;
}

compileFile('./examples/parse-test.lctwa');

// main(Deno.args);
