import { assertStringIncludes } from "https://deno.land/std@0.139.0/testing/asserts.ts";
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
    .split("\n")
    .map((line: string) => line.trim());
}

/**
 * Checks that the provided statement(s) result in the provided lines being generated.
 * @param statements statements source that is wrapped in a module
 * @param includes sequence of lines that should be included in the result
 */
export function assertGeneratedStatementIncludes(
  statements: string[],
  includes: string[],
): void {
  const moduleSource = `
    func otherFunc(i32param: i32): i32 {
      return i32param;
    }
    func sourceFunc(i32param: i32, f32param: f32): void {
      ${statements.join("\n")}
    }
  `;

  const generationResult: string = generateModuleSample(moduleSource).join(
    "\n",
  );
  const includedSequence: string = includes.join("\n");
  assertStringIncludes(
    generationResult,
    includedSequence,
  );
}
