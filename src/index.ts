import { compile } from "./lang/Compiler.ts";
import { Token } from "./lang/lexer/Token.ts";

async function main(args: string[]) {
  const source: string = await Deno.readTextFile('./examples/generation-test.lctwa');
  const result: string = compile(source);
  console.log(result);
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

main(Deno.args);
