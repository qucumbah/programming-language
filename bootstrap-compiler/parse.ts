import { Token } from './types.ts';
import { Iter } from './createIterator.ts';
import Module from './ast/Module.ts';
import Func from './ast/Func.ts';
import Argument from './ast/Argument.ts';
import Type from './ast/Type.ts';
import Statement from "./ast/Statement.ts";
import Expression from "./ast/Expression.ts";

export default function parse(tokens: Iter<Token>): Module {
  return parseModule(tokens);
}

function parseModule(tokens: Iter<Token>): Module {
  const funcs: Func[] = [];
  while (tokens.hasNext()) {
    if (tokens.peekNext()[0] === 'func') {
      funcs.push(parseFunction(tokens));
    }
  }

  return {
    funcs,
  };
}

function parseFunction(tokens: Iter<Token>): Func {
  expect(tokens.next(), 'func');

  const name: string = expect(tokens.next(), 'identifier');
  expect(tokens.next(), '(');

  const args: Argument[] = [];
  while (tokens.peekNext()[0] !== ')') {
    args.push(parseArgument(tokens));
  }

  expect(tokens.next(), ')');
  expect(tokens.next(), ':');

  // TODO: make type system stronger to make sure that each 'type' token has correct type
  const type: Type = expect(tokens.next(), 'type') as Type;

  expect(tokens.next(), '{');

  const statements: Statement[] = [];
  while (tokens.peekNext()[0] !== '}') {
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
  const name: string = expect(tokens.next(), 'identifier');
  expect(tokens.next(), ':');
  const type: Type = expect(tokens.next(), 'type') as Type;

  if (tokens.peekNext()[0] === ',') {
    tokens.next();
  }

  return {
    name,
    type,
  };
}

function parseStatement(tokens: Iter<Token>): Statement {
  switch (tokens.peekNext()[0]) {
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
  while (tokens.peekNext()[0] !== '}') {
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
  while (tokens.peekNext()[0] !== '}') {
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
  const variableIdentifier: string = expect(tokens.next(), 'identifier');

  expect(tokens.next(), ':');
  const variableType: Type = expect(tokens.next(), 'type') as Type;

  expect(tokens.next(), 'operator', '=');

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
  return {};
}

function expect(token: Token, type: string, value?: string): string {
  if (token[0] !== type) {
    throw new Error(`Unexpected token: ${token}. Expected: ${type}`);
  }

  if (value !== undefined && token[1] !== value) {
    throw new Error(`Unexpected token: ${token}. Expected: ${[type, value]}`);
  }

  return token[1];
}
