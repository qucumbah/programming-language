import { parseCliArguments, CompilerOptions } from './CliArgumentsParser.ts';
import Iter from './ArrayIterator.ts';
import { lex, Token } from './Lexer.ts';
import { parse } from './Parser.ts';
import Module from './ast/Module.ts';

async function main(args: string[]) {
  const [sourceFile]: [string, CompilerOptions] = parseCliArguments(args);
  const tree: Module = await compileFile(sourceFile);
  console.log(tree);
}

async function compileFile(sourceFile: string): Promise<Module> {
  const source: string = await Deno.readTextFile(sourceFile);
  const tokens: Token[] = lex(source);
  const tree = parse(new Iter(tokens));
  console.log(JSON.stringify(tree, null, 2));
  return tree;
}

compileFile('./examples/parse-test.lctwa');

// main(Deno.args);
