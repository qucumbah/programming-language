import { Token } from "./lang/lexer/Token.ts";

function printProgramOutOfTokens(tokens: Token[]) {
  let result = "";
  let prevLine = 1;
  for (const token of tokens) {
    if (token.line !== prevLine) {
      result += "\n";
      prevLine = token.line;
    }

    result += token.value;
    result += " ";
  }
  console.log(result);
}
