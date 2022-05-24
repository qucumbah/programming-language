import Iter from "../ArrayIterator.ts";
import ParameterDeclaration from "../ast/ParameterDeclaration.ts";
import Func from "../ast/Func.ts";
import Module from "../ast/Module.ts";
import Statement from "../ast/Statement.ts";
import Type, { NonVoidType } from "../ast/Type.ts";
import { Token } from "../lexer/Token.ts";
import { expect, expectType } from "./Expect.ts";
import { parseStatement } from "./StatementParser.ts";
import { parseNonVoidType, parseType } from "./TypeParser.ts";

/**
 * Shorthand for `parseModule`
 *
 * @param tokens iterator of tokens that compose this module.
 *   It will be moved until all module tokens are consumed.
 * @returns the resulting module
 */
export function parse(tokens: Iter<Token>): Module {
  return parseModule(tokens);
}

/**
 * Currently, module is just a collection of functions, so we can parse them one-by-one
 *
 * @param tokens iterator of tokens that compose this module.
 *   It will be moved until all module tokens are consumed.
 * @returns the resulting module
 */
export function parseModule(tokens: Iter<Token>): Module {
  const funcs: Func[] = [];
  while (tokens.hasNext()) {
    expect(tokens.peekNext(), "func");
    funcs.push(parseFunction(tokens));
  }

  return {
    funcs,
  };
}

/**
 * Function consists of signature (identifier, return type, arguments) and body (statement array)
 *
 * @param tokens iterator of tokens that compose this function.
 *   It will be moved until all function tokens are consumed.
 * @returns the resulting function
 */
export function parseFunction(tokens: Iter<Token>): Func {
  const firstToken: Token = tokens.next();
  expect(firstToken, "func");

  const name: string = expectType(tokens.next(), "identifier");

  expect(tokens.next(), "(");

  const parameters: ParameterDeclaration[] = [];
  while (tokens.peekNext().value !== ")") {
    parameters.push(parseArgument(tokens));
  }

  expect(tokens.next(), ")");
  expect(tokens.next(), ":");

  const type: Type = parseType(tokens);

  expect(tokens.next(), "{");

  const statements: Statement[] = [];
  while (tokens.peekNext().value !== "}") {
    statements.push(parseStatement(tokens));
  }

  const closingBracket: Token = tokens.next();
  expect(closingBracket, "}");

  return {
    name,
    parameters,
    type,
    statements,
    position: {
      start: firstToken.position,
      end: closingBracket.position,
    },
  };
}

/**
 * Argument consists of name (identifier) and type
 *
 * @param tokens iterator of tokens that compose this argument.
 *   It will be moved until all argument tokens (including the comma after the argument)
 *   are consumed.
 * @returns the resulting argument
 */
export function parseArgument(tokens: Iter<Token>): ParameterDeclaration {
  const firstToken: Token = tokens.next();
  expectType(firstToken, "identifier");
  const name: string = firstToken.value;

  expect(tokens.next(), ":");

  const type: NonVoidType = parseNonVoidType(tokens);

  // Consume trailing comma
  if (tokens.peekNext().value === ",") {
    tokens.next();
  }

  return {
    name,
    type,
    position: {
      start: firstToken.position,
      end: firstToken.position,
    },
  };
}
