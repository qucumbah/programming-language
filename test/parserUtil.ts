import { assertObjectMatch } from "https://deno.land/std@0.139.0/testing/asserts.ts";
import ArrayIterator from "../src/lang/ArrayIterator.ts";
import { lex } from "../src/lang/lexer/Lexer.ts";
import { parseExpression } from "../src/lang/parser/ExpressionParser.ts";
import { parseModule,parseFunction,parseArgument } from "../src/lang/parser/Parser.ts";
import { parseStatement } from "../src/lang/parser/StatementParser.ts";

/**
 * Parses the provided module sample and compares the resulting AST to the expected one.
 * Ignores extra properties on parsed AST, only checks the ones on the expected tree.
 * 
 * @param sample source to generate AST from
 * @param expectedAstStructure skeleton of expected AST
 * @param log whether to log the generated AST
 */
export function compareModuleParsingResult(sample: string, expectedAstStructure: any, log?: boolean): void {
  return compareParsingResult(parseModule, sample, expectedAstStructure, log);
}

/**
 * Parses the provided function sample and compares the resulting AST to the expected one.
 * Ignores extra properties on parsed AST, only checks the ones on the expected tree.
 * 
 * @param sample source to generate AST from
 * @param expectedAstStructure skeleton of expected AST
 * @param log whether to log the generated AST
 */
export function compareFunctionParsingResult(sample: string, expectedAstStructure: any, log?: boolean): void {
  return compareParsingResult(parseFunction, sample, expectedAstStructure, log);
}

/**
 * Parses the provided argument sample and compares the resulting AST to the expected one.
 * Ignores extra properties on parsed AST, only checks the ones on the expected tree.
 * 
 * @param sample source to generate AST from
 * @param expectedAstStructure skeleton of expected AST
 * @param log whether to log the generated AST
 */
export function compareArgumentParsingResult(sample: string, expectedAstStructure: any, log?: boolean): void {
  return compareParsingResult(parseArgument, sample, expectedAstStructure, log);
}

/**
 * Parses the provided expression sample and compares the resulting AST to the expected one.
 * Ignores extra properties on parsed AST, only checks the ones on the expected tree.
 * 
 * @param sample source to generate AST from
 * @param expectedAstStructure skeleton of expected AST
 * @param log whether to log the generated AST
 */
export function compareExpressionParsingResult(sample: string, expectedAstStructure: any, log?: boolean): void {
  return compareParsingResult(parseExpression, sample, expectedAstStructure, log);
}

/**
 * Parses the provided statement sample and compares the resulting AST to the expected one.
 * Ignores extra properties on parsed AST, only checks the ones on the expected tree.
 * 
 * @param sample source to generate AST from
 * @param expectedAstStructure skeleton of expected AST
 * @param log whether to log the generated AST
 */
export function compareStatementParsingResult(sample: string, expectedAstStructure: any, log?: boolean): void {
  return compareParsingResult(parseStatement, sample, expectedAstStructure, log);
}

function compareParsingResult(
  parser: (
    typeof parseModule
    | typeof parseFunction
    | typeof parseArgument
    | typeof parseStatement
    | typeof parseExpression
  ),
  sample: string,
  expectedAstStructure: any,
  log?: boolean,
) {
  const ast = parser(new ArrayIterator(lex(sample)));

  if (log) {
    console.log(ast);
  }

  assertObjectMatch(ast, expectedAstStructure);
}
