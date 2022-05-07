import { BinaryOperators, Token, UnaryOperators } from './Lexer.ts';
import Iter from './ArrayIterator.ts';
import Module from './ast/Module.ts';
import Func from './ast/Func.ts';
import Argument from './ast/Argument.ts';
import Type from './ast/Type.ts';
import Statement from './ast/Statement.ts';
import Expression from './ast/Expression.ts';

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

/**
 * Argument consists of name (identifier) and type
 * 
 * @param tokens iterator of tokens that compose this argument.
 *   It will be moved until all argument tokens (including the comma after the argument)
 *   are consumed.
 * @returns the resulting argument
 */
function parseArgument(tokens: Iter<Token>): Argument {
  expectType(tokens.peekNext(), 'identifier');
  const name: string = tokens.next().value;

  expect(tokens.next(), ':');
  const type: Type = expectType(tokens.next(), 'type') as Type;

  // Consume trailing comma
  if (tokens.peekNext().value === ',') {
    tokens.next();
  }

  return {
    name,
    type,
  };
}

/**
 * Function for parsing different kinds of statements: conditionals, loops, returns, etc.
 * 
 * @param tokens iterator of tokens that compose this statement.
 *   It will be moved until all statement tokens (including `;`) are consumed.
 * @returns the resulting argument
 */
function parseStatement(tokens: Iter<Token>): Statement {
  const firstToken: Token = tokens.peekNext();

  if (firstToken.value === 'if') {
    return parseConditionalStatement(tokens);
  }

  if (firstToken.value === 'while') {
    return parseLoopStatement(tokens);
  }

  if (firstToken.value === 'var') {
    return parseVariableDeclarationStatement(tokens);
  }

  if (firstToken.value === 'return') {
    return parseReturnStatement(tokens);
  }

  // It's guaranteed that there will be at least two more tokens at this point:
  // statement terminator and the scope closing bracket
  const secondToken: Token = tokens.peekNext(1);

  if (firstToken.type === 'identifier' && secondToken.value === '=') {
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
  const returnValue: Expression = parseExpression(tokens);

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

/**
 * Operator precedence, from lowest to highest.
 * This will be used to determine the order of operations when an expression is parsed.
 */
const operatorPrecenence: ReadonlyArray<ReadonlyArray<typeof BinaryOperators[number]>> = [
  ['<', '<=', '>', '>='],
  ['=='],
  ['+', '-'],
  ['*', '/'],
];

/**
 * Expressions are parsed using recursive descent.
 * 
 * @param tokens iterator of tokens that compose this expression.
 *   It will be moved until all expression tokens are consumed.
 * @returns the resulting expression
 */
function parseExpression(tokens: Iter<Token>): Expression {
  const expressionParseResult: ExpressionParseResult = parseExpressionInner(tokens);

  if (expressionParseResult.error) {
    throw new Error(`Expression parse error: ${tokens.peekNext().value}`);
  }

  while (tokens.peekNext() !== expressionParseResult.tokensAfter.peekNext()) {
    // `parseExpressionInner` clones the token iterator internally
    // and doesn't modify the provided one.
    // Thus, we have to manually skip tokens from parsed expression.
    tokens.next();
  }

  return expressionParseResult.expression;
}

/**
 * Expression parsing result.
 * 
 * Recursive descent parsing is a trial and error technique
 * thus we have to have an easy way to check whether a parsing portion was successful.
 * 
 * For the same reason, we don't want to modify the provided tokens iterator,
 * so we clone it internally and return the cloned one if parsing was successful.
 * It should be advanced a few tokens deep in this case.
 * 
 * In future, this may contain the invalid token if any errors are encountered.
 */
type ExpressionParseResult = {
  error: true,
  // failingToken: Token,
} | {
  error: false,
  expression: Expression,
  tokensAfter: Iter<Token>,
};

/**
 * Parse the expression (or an expression portion) using recursive descent.
 * 
 * Parses whatever it can until it runs out of options.
 * If whatever was parsed makes sense, returns it.
 * If there were errors in all possible trees, returns an error.
 * 
 * @param tokens tokens iterator positioned at the start of the statement.
 * It will not be modified due to the trial-and-error nature of the recursive descent algorithm.
 * 
 * @param level exprected operator precenence level.
 * Default value is 0 (for the lowest operator precedence).
 * This function will call itself recursively, increasing the level on each call.
 * If we run out of levels for operator precedence (level == operator precedence dictionary length),
 * there are no more binary operators left, and the remaining expressions are basic.
 * 
 * @returns parsing result, which contains error indicator, the resulting expression,
 * and the advanced tokens iterator
 */
function parseExpressionInner(tokens: Iter<Token>, level = 0): ExpressionParseResult {
  // Make a clone in case we're passing an impossible expression.
  // This way we don't have to revert iterator state.
  const tokensClone: Iter<Token> = tokens.clone();

  if (level === operatorPrecenence.length) {
    // We're down to the most basic level: no binary operators left
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
      const secondToken: Token = tokensClone.peekNext();

      if (secondToken.value === '(') {
        // If a parenthesis follows an identifier, we have a function call

        // Consume the opening parenthesis
        tokensClone.next();

        const argumentValues: Expression[] = [];

        while (true) {
          if (tokensClone.peekNext().value === ')') {
            // Consume closing parenthesis
            tokensClone.next();
            break;
          }

          argumentValues.push(parseExpression(tokensClone));

          if (tokensClone.peekNext().value === ',') {
            // Consume trailing comma
            tokensClone.next();
          }
        }

        const expression: Expression = {
          type: 'functionCall',
          functionIdentifier: firstToken.value,
          argumentValues,
        };

        return {
          error: false,
          expression,
          tokensAfter: tokensClone,
        }
      }

      // Otherwise we have a simple identifier statement

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

/**
 * Assertion for token value
 * 
 * @param token provided token
 * @param value expected token value
 */
function expect(token: Token, value: string): void {
  if (token.value !== value) {
    throw new Error(`Unexpected token: ${token.value}. Expected: ${value}. Position: line ${token.line}, col ${token.colStart}.`);
  }
}

/**
 * Assertion for token type
 * 
 * @param token provided token
 * @param type expected token tyoe
 * 
 * @returns provided token value (for convenience)
 */
function expectType(token: Token, type: typeof token.type): string {
  if (token.type !== type) {
    throw new Error(`Unexpected token type: ${token.type}. Expected: ${type}. Position: line ${token.line}, col ${token.colStart}.`);
  }

  return token.value;
}
