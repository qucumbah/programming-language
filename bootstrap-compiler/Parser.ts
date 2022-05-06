import { BinaryOperators, Token, UnaryOperators } from './Lexer.ts';
import { Iter } from './ArrayIterator.ts';
import Module from './ast/Module.ts';
import Func from './ast/Func.ts';
import Argument from './ast/Argument.ts';
import Type from './ast/Type.ts';
import Statement from "./ast/Statement.ts";
import Expression from "./ast/Expression.ts";

export function parse(tokens: Iter<Token>): Module {
  return parseModule(tokens);
}

function parseModule(tokens: Iter<Token>): Module {
  const funcs: Func[] = [];
  while (tokens.hasNext()) {
    if (tokens.peekNext().value === 'func') {
      funcs.push(parseFunction(tokens));
    }
  }

  return {
    funcs,
  };
}

function parseFunction(tokens: Iter<Token>): Func {
  expect(tokens.next(), 'func');

  const name: string = expectType(tokens.next(), 'identifier');

  expect(tokens.next(), '(');

  const args: Argument[] = [];
  while (tokens.peekNext().value !== ')') {
    args.push(parseArgument(tokens));
  }

  expect(tokens.next(), ')');
  expect(tokens.next(), ':');

  const type = expectType(tokens.next(), 'type') as Type;

  expect(tokens.next(), '{');

  const statements: Statement[] = [];
  while (tokens.peekNext().value !== '}') {
    statements.push(parseStatement(tokens));
  }

  expect(tokens.next(), '}');

  return {
    name,
    args,
    type,
    statements,
  };
}

function parseArgument(tokens: Iter<Token>): Argument {
  expectType(tokens.peekNext(), 'identifier');
  const name: string = tokens.next().value;

  expect(tokens.next(), ':');
  const type: Type = expectType(tokens.next(), 'type') as Type;

  if (tokens.peekNext().value === ',') {
    tokens.next();
  }

  return {
    name,
    type,
  };
}

function parseStatement(tokens: Iter<Token>): Statement {
  switch (tokens.peekNext().value) {
    case 'if': return parseConditionalStatement(tokens);
    case 'while': return parseLoopStatement(tokens);
    case 'var': return parseVariableDeclarationStatement(tokens);
    case 'return': return parseReturnStatement(tokens);
    default: return parseExpressionStatement(tokens);
  }
}

function parseConditionalStatement(tokens: Iter<Token>): Statement {
  expect(tokens.next(), 'if');

  expect(tokens.next(), '(');
  const condition: Expression = parseExpression(tokens);
  expect(tokens.next(), ')');

  expect(tokens.next(), '{');
  const body: Statement[] = [];
  while (tokens.peekNext().value !== '}') {
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
  while (tokens.peekNext().value !== '}') {
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
  const returnValue: Expression = parseExpression(tokens);

  expect(tokens.next(), ';');

  return {
    type: 'return',
    value: returnValue,
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

function parseExpression(tokens: Iter<Token>): Expression {
  const firstToken: Token = tokens.peekNext(0);
  const secondToken: Token = tokens.peekNext(1);

  if (firstToken.type === 'identifier') {
    if (secondToken.value === '(') {
      return parseFunctionCallExpression(tokens);
    }

    return parseIdentifierExpression(tokens);
  }

  if ((UnaryOperators as readonly string[]).includes(firstToken.value)) {
    return parseUnaryOperatorExpression(tokens);
  }

  if ((BinaryOperators as readonly string[]).includes(secondToken.value)) {
    return parseBinaryOperatorExpression(tokens);
  }

  if (firstToken.type === 'number') {
    return parseNumericExpression(tokens);
  }

  if (firstToken.value === '(') {
    return parseCompositeExpression(tokens);
  }

  throw new Error(`Invalid token for expression: ${firstToken.value}`);
}

function parseNumericExpression(tokens: Iter<Token>): Expression {
  const value: string = expectType(tokens.next(), 'number');
  return {
    type: 'numeric',
    value,
  };
}

function parseFunctionCallExpression(tokens: Iter<Token>): Expression {
  const functionIdentifier: string = expectType(tokens.next(), 'identifier');
  expect(tokens.next(), '(');

  const argumentValues: Expression[] = [];
  while (tokens.peekNext().value !== ')') {
    argumentValues.push(parseExpression(tokens));

    if (tokens.peekNext().value === ',') {
      tokens.next();
    }
  }

  return {
    type: 'functionCall',
    functionIdentifier,
    argumentValues,
  };
}

function parseIdentifierExpression(tokens: Iter<Token>): Expression {
  const identifier: string = expectType(tokens.next(), 'identifier');
  return {
    type: 'identifier',
    identifier,
  };
}

function parseUnaryOperatorExpression(tokens: Iter<Token>): Expression {
  const operator = expectType(tokens.next(), 'operator');
  if (!(UnaryOperators as readonly string[]).includes(operator)) {
    throw new Error(`Invalid unary operator: ${operator}`);
  }

  const value: Expression = parseExpression(tokens);

  return {
    type: 'unaryOperator',
    operator: operator as typeof UnaryOperators[number],
    value,
  };
}

function parseBinaryOperatorExpression(tokens: Iter<Token>): Expression {
  const left: Expression = parseExpression(tokens);

  const operator = expectType(tokens.next(), 'operator');
  if (!(BinaryOperators as readonly string[]).includes(operator)) {
    throw new Error(`Invalid binary operator: ${operator}`);
  }

  const right: Expression = parseExpression(tokens);

  return {
    type: 'binaryOperator',
    operator: operator as typeof BinaryOperators[number],
    left,
    right,
  };
}

function parseCompositeExpression(tokens: Iter<Token>): Expression {
  expect(tokens.next(), '(');
  const value: Expression = parseExpression(tokens);
  expect(tokens.next(), ')');

  return {
    type: 'composite',
    value,
  };
}

function expect(token: Token, value: string): void {
  if (token.value !== value) {
    throw new Error(`Unexpected token: ${token.value}. Expected: ${value}`);
  }
}

function expectType(token: Token, type: typeof token.type): string {
  if (token.type !== type) {
    throw new Error(`Unexpected token type: ${token.type}. Expected: ${type}`);
  }

  return token.value;
}
