import ArrayIterator from "../src/lang/ArrayIterator.ts";
import { generate } from "../src/lang/generator/Generator.ts";
import { lex } from "../src/lang/lexer/Lexer.ts";
import { parse } from "../src/lang/parser/Parser.ts";
import TypedModule from "../src/lang/typedAst/TypedModule.ts";
import { validate } from "../src/lang/validator/Validator.ts";

/**
 * Generates WAST of a module provided source.
 * Returns an array of trimmed generated lines.
 *
 * @param module module source to generate
 * @returns generated WAST
 */
export function generateModuleSample(module: string): string[] {
  const typedAst: TypedModule = validate(parse(new ArrayIterator(lex(module))));

  return generate(typedAst)
    .split('\n')
    .map((line: string) => line.trim());
}
