import { BinaryOperators, Token, UnaryOperators } from './Lexer.ts';
import Iter from './ArrayIterator.ts';
import Module from './ast/Module.ts';
import Func from './ast/Func.ts';
import Argument from './ast/Argument.ts';
import Type from './ast/Type.ts';
import Statement from './ast/Statement.ts';
import Expression from './ast/Expression.ts';

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

const operatorPrecenence: ReadonlyArray<ReadonlyArray<typeof BinaryOperators[number]>> = [
  ['<', '<=', '>', '>='],
  ['=='],
  ['+', '-'],
  ['*', '/'],
];

function parseExpression(tokens: Iter<Token>): Expression {
  const expressionParseResult: ExpressionParseResult = parseExpressionInner(tokens);

  if (expressionParseResult.error) {
    throw new Error(`Expression parse error: ${tokens.peekNext().value}`);
  }

  while (tokens.peekNext() !== expressionParseResult.tokensAfter.peekNext()) {
    // Skip tokens from parsed expression
    tokens.next();
  }

  return expressionParseResult.expression;
}

type ExpressionParseResult = {
  error: true,
} | {
  error: false,
  expression: Expression,
  tokensAfter: Iter<Token>,
};

function parseExpressionInner(tokens: Iter<Token>, level = 0): ExpressionParseResult {
  // Make a clone in case we're passing an impossible expression.
  // This way we don't have to revert iterator state.
  const tokensClone: Iter<Token> = tokens.clone();

  if (level === operatorPrecenence.length) {
    // We're down to the most basic level: no binary operators left
    // TODO: add function calls
    const firstToken: Token = tokensClone.next();

    if (firstToken.type === 'number') {
      const expression: Expression = {
        type: 'numeric',
        value: firstToken.value,
      };

      return {
        error: false,
        expression,
        tokensAfter: tokensClone,
      };
    }

    if (firstToken.type === 'identifier') {
      const expression: Expression = {
        type: 'identifier',
        identifier: firstToken.value,
      };

      return {
        error: false,
        expression,
        tokensAfter: tokensClone,
      };
    }

    if (firstToken.value === '(') {
      const innerExpressionParsingResult: ExpressionParseResult = parseExpressionInner(tokensClone);

      // Propagate error and try to explore a different branch
      if (innerExpressionParsingResult.error) {
        return { error: true };
      }

      const expression: Expression = {
        type: 'composite',
        value: innerExpressionParsingResult.expression,
      };

      expect(innerExpressionParsingResult.tokensAfter.next(), ')');

      return {
        error: false,
        expression,
        tokensAfter: innerExpressionParsingResult.tokensAfter,
      };
    }

    if (
      firstToken.type === 'operator'
      && (UnaryOperators as readonly string[]).includes(firstToken.value)
    ) {
      // We can only have the most basic expression after an unary operator.
      // Thus, parse with level == operatorPrecenence.length
      const innerExpressionParsingResult: ExpressionParseResult = parseExpressionInner(
        tokensClone,
        operatorPrecenence.length,
      );

      if (innerExpressionParsingResult.error) {
        return { error: true };
      }

      const expression: Expression = {
        type: 'unaryOperator',
        operator: firstToken.value as typeof UnaryOperators[number],
        value: innerExpressionParsingResult.expression,
      };

      return {
        error: false,
        expression,
        tokensAfter: innerExpressionParsingResult.tokensAfter,
      };
    }

    return { error: true };
  }

  // From now on, the only option is the binary operator expression (or the end of the expression).

  const leftmost: ExpressionParseResult = parseExpressionInner(tokens, level + 1);

  if (leftmost.error) {
    return { error: true };
  }

  let result: ExpressionParseResult = leftmost;

  while (true) {
    const nextToken: Token = result.tokensAfter.peekNext();

    // If we don't see the operator with correct precenence
    if (!(operatorPrecenence as readonly string[][])[level].includes(nextToken.value)) {
      // We're either at the end of the expression (next token is not an operator of any precenence)
      if (!(BinaryOperators as readonly string[]).includes(nextToken.value)) {
        // In this case, the part parsed until now is valid
        return result;
      }

      // Or operator precedence is incorrect, so just return whatever we've managed to parse
      // To be exact, operator precenence should be less then the current level
      // Otherwise it would have been picked up by previous call to parse the next level
      return result;
    }

    // If we do see the correct operator, parse the next part
    // e.g. <leftmost> <operator> <nextPart> <operator> <nextPart> ...

    const tokensAfter: Iter<Token> = result.tokensAfter;
    const operator = expectType(tokensAfter.next(), 'operator') as typeof BinaryOperators[number];

    const nextPart: ExpressionParseResult = parseExpressionInner(tokensAfter, level + 1);

    if (nextPart.error) {
      return { error: true };
    }

    const expression: Expression = {
      type: 'binaryOperator',
      left: result.expression,
      right: nextPart.expression,
      operator,
    };

    result = {
      error: false,
      expression,
      tokensAfter: nextPart.tokensAfter,
    };
  }
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
