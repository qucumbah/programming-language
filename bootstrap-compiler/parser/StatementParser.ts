import Iter from '../ArrayIterator.ts';
import Type from '../ast/Type.ts';
import Statement from '../ast/Statement.ts';
import Expression from '../ast/Expression.ts';
import { Token } from "../lexer/Token.ts";
import { expect,expectType } from "./Expect.ts";
import { parseExpression } from "./ExpressionParser.ts";

/**
 * Function for parsing different kinds of statements: conditionals, loops, returns, etc.
 *
 * @param tokens iterator of tokens that compose this statement.
 *   It will be moved until all statement tokens (including `;`) are consumed.
 * @returns the resulting argument
 */
export function parseStatement(tokens: Iter<Token>): Statement {
  const firstToken: Token = tokens.peekNext();

  if(firstToken.value === 'if') {
    return parseConditionalStatement(tokens);
  }

  if(firstToken.value === 'while') {
    return parseLoopStatement(tokens);
  }

  if(firstToken.value === 'var') {
    return parseVariableDeclarationStatement(tokens);
  }

  if(firstToken.value === 'return') {
    return parseReturnStatement(tokens);
  }

  // It's guaranteed that there will be at least two more tokens at this point:
  // statement terminator and the scope closing bracket
  const secondToken: Token = tokens.peekNext(1);

  if(firstToken.type === 'identifier' && secondToken.value === '=') {
    return parseAssignmentStatement(tokens);
  }

  return parseExpressionStatement(tokens);
}
function parseConditionalStatement(tokens: Iter<Token>): Statement {
  expect(tokens.next(), 'if');

  expect(tokens.next(), '(');
  const condition: Expression = parseExpression(tokens);
  expect(tokens.next(), ')');

  expect(tokens.next(), '{');
  const body: Statement[] = [];
  while(tokens.peekNext().value !== '}') {
    body.push(parseStatement(tokens));
  }
  expect(tokens.next(), '}');

  return {
    type: 'conditional',
    condition,
    body,
  };
}
function parseLoopStatement(tokens: Iter<Token>): Statement {
  expect(tokens.next(), 'while');

  expect(tokens.next(), '(');
  const condition: Expression = parseExpression(tokens);
  expect(tokens.next(), ')');

  expect(tokens.next(), '{');
  const body: Statement[] = [];
  while(tokens.peekNext().value !== '}') {
    body.push(parseStatement(tokens));
  }
  expect(tokens.next(), '}');

  return {
    type: 'loop',
    condition,
    body,
  };
}
function parseVariableDeclarationStatement(tokens: Iter<Token>): Statement {
  expect(tokens.next(), 'var');
  const variableIdentifier: string = expectType(tokens.next(), 'identifier');

  expect(tokens.next(), ':');
  const variableType: Type = expectType(tokens.next(), 'type') as Type;

  // For now, we have to initialize the newly declared variable. This may change.
  expect(tokens.next(), '=');

  const value: Expression = parseExpression(tokens);

  expect(tokens.next(), ';');

  return {
    type: 'variableDeclaration',
    variableIdentifier,
    variableType,
    value,
  };
}
function parseReturnStatement(tokens: Iter<Token>): Statement {
  expect(tokens.next(), 'return');

  // We may simply return from the function if its type is void
  const returnValue: Expression | null = (
    (tokens.peekNext().value === ';') ? null : parseExpression(tokens)
  );

  expect(tokens.next(), ';');

  return {
    type: 'return',
    value: returnValue,
  };
}
function parseAssignmentStatement(tokens: Iter<Token>): Statement {
  const variableIdentifier: string = expectType(tokens.next(), 'identifier');

  expect(tokens.next(), '=');

  const value: Expression = parseExpression(tokens);

  expect(tokens.next(), ';');

  return {
    type: 'variableAssignment',
    variableIdentifier,
    value,
  };
}
function parseExpressionStatement(tokens: Iter<Token>): Statement {
  const value: Expression = parseExpression(tokens);

  expect(tokens.next(), ';');

  return {
    type: 'expression',
    value,
  };
}
