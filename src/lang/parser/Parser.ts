import Iter from "../ArrayIterator.ts";
import ParameterDeclaration from "../ast/ParameterDeclaration.ts";
import Func from "../ast/Func.ts";
import Module from "../ast/Module.ts";
import Statement from "../ast/Statement.ts";
import Type from "../ast/Type.ts";
import { Token } from "../lexer/Token.ts";
import { expect,expectType, throwTokenError } from "./Expect.ts";
import { parseStatement } from "./StatementParser.ts";
import { BasicTypes } from "../lexer/BasicTypes.ts";

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
function parseModule(tokens: Iter<Token>): Module {
  const funcs: Func[] = [];
  while (tokens.hasNext()) {
    expect(tokens.peekNext(), 'func');
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
function parseFunction(tokens: Iter<Token>): Func {
  expect(tokens.next(), 'func');

  const name: string = expectType(tokens.next(), 'identifier');

  expect(tokens.next(), '(');

  const parameters: ParameterDeclaration[] = [];
  while (tokens.peekNext().value !== ')') {
    parameters.push(parseArgument(tokens));
  }

  expect(tokens.next(), ')');
  expect(tokens.next(), ':');

  const type = expectType(tokens.next(), 'basicType') as typeof BasicTypes[number];

  expect(tokens.next(), '{');

  const statements: Statement[] = [];
  while (tokens.peekNext().value !== '}') {
    statements.push(parseStatement(tokens));
  }

  expect(tokens.next(), '}');

  return {
    name,
    parameters,
    type: {
      kind: 'basic',
      value: type,
    },
    statements,
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
function parseArgument(tokens: Iter<Token>): ParameterDeclaration {
  expectType(tokens.peekNext(), 'identifier');
  const name: string = tokens.next().value;

  expect(tokens.next(), ':');

  const typeToken: Token = tokens.next();
  const type = expectType(typeToken, 'basicType') as typeof BasicTypes[number];

  if (type === 'void') {
    throwTokenError(typeToken, 'Parameter type cannot be void.');
  }

  // Consume trailing comma
  if (tokens.peekNext().value === ',') {
    tokens.next();
  }

  return {
    name,
    type: {
      kind: 'basic',
      value: type,
    },
  };
}
