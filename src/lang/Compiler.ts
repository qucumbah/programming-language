import Iter from "./ArrayIterator.ts";
import Module from "./ast/Module.ts";
import { generate } from "./generator/Generator.ts";
import { lex } from "./lexer/Lexer.ts";
import { Token } from "./lexer/Token.ts";
import { parse } from "./parser/Parser.ts";
import TypedModule from "./typedAst/TypedModule.ts";
import { validate } from "./validator/Validator.ts";

/**
 * Compiles provided language code to WAST.
 * 
 * High-level overview of the process:
 * 1. Lexer splits up the source string into lexical tokens
 * 2. Parser builds an abstract syntax tree from tokens
 * 3. Validator checks that all types match and assigns the result types to expressions
 * 4. Generator traverses the abstract syntax tree and generates WASM text code
 * 
 * @param source source code to compile
 * @returns compiled web assembly text module
 */
export function compile(source: string): string {
  const tokens: Token[] = lex(source);
  const tree: Module = parse(new Iter(tokens));
  // console.log(JSON.stringify(tree, null, 2));
  const typedTree: TypedModule = validate(tree);
  const generatedSource: string = generate(typedTree);
  return generatedSource;
}
