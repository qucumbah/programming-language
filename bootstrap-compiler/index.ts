import { parseCliArguments, CompilerOptions } from './CliArgumentsParser.ts';
import Iter from './ArrayIterator.ts';
import { lex } from './lexer/Lexer.ts';
import { Token } from "./lexer/Token.ts";
import { parse } from './Parser.ts';
import Module from './ast/Module.ts';
import { validate } from "./Validator.ts";
import { generate } from "./Generator.ts";

async function main(args: string[]) {
  const [sourceFile]: [string, CompilerOptions] = parseCliArguments(args);
  const tree: Module = await compileFile(sourceFile);
  console.log(tree);
}

// @ts-ignore
async function compileFile(sourceFile: string): Promise<Module> {
  const source: string = await Deno.readTextFile(sourceFile);
  const tokens: Token[] = lex(source);
  const tree: Module = parse(new Iter(tokens));
  validate(tree);
  // console.log(JSON.stringify(tree, null, 2));
  const generatedSource: string = generate(tree);
  console.log(generatedSource);
  // return tree;
}

function printProgramOutOfTokens(tokens: Token[]) {
  let result = '';
  let prevLine = 1;
  for (const token of tokens) {
    if (token.line !== prevLine) {
      result += '\n';
      prevLine = token.line;
    }

    result += token.value;
    result += ' ';
  }
  console.log(result);
}

compileFile('./examples/generation-test.lctwa');

// main(Deno.args);
