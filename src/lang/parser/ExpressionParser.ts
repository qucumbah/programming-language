import Iter from "../ArrayIterator.ts";
import Expression from "../ast/Expression.ts";
import { BinaryOperators,UnaryOperators } from "../lexer/Operators.ts";
import { Token } from "../lexer/Token.ts";
import { expect,expectType } from "./Expect.ts";

/**
 * Operator precedence, from lowest to highest.
 * This will be used to determine the order of operations when an expression is parsed.
 */
const operatorPrecenenceMap: { [operator in typeof BinaryOperators[number]]: number } = {
  '<': 0,
  '<=': 0,
  '>': 0,
  '>=': 0,
  '==': 1,
  '!=': 1,
  '+': 2,
  '-': 2,
  '*': 3,
  '/': 3,
};

type BinaryOperator = typeof BinaryOperators[number];
type OperatorPrecedence = ReadonlyArray<ReadonlyArray<BinaryOperator>>;

/**
 * Same as operatorPrecenenceMap, but optimized for simpler search: each level is represented as
 * an array of operators.
 */
const possiblePrecedenceLevels: number[] = [...new Set(Object.values(operatorPrecenenceMap))];
const operatorPrecenence: OperatorPrecedence = possiblePrecedenceLevels.map((precedence: number) => {
  return BinaryOperators.filter(
    (operator: BinaryOperator) => operatorPrecenenceMap[operator] === precedence
  );
});

  /**
 * Expressions are parsed using recursive descent.
 *
 * @param tokens iterator of tokens that compose this expression.
 *   It will be moved until all expression tokens are consumed.
 * @returns the resulting expression
 */

export function parseExpression(tokens: Iter<Token>): Expression {
  const expressionParseResult: ExpressionParseResult = parseExpressionInner(tokens);

  if(expressionParseResult.error) {
    const failingToken: Token = expressionParseResult.failingToken;
    throw new Error(`Expression parse error: unexpected token ${failingToken.value}. Line ${failingToken.position.line}, col ${failingToken.position.colStart}.`);
  }

  while(tokens.peekNext() !== expressionParseResult.tokensAfter.peekNext()) {
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
  error: true;
  failingToken: Token;
} | {
  error: false;
  expression: Expression;
  tokensAfter: Iter<Token>;
  lastToken: Token;
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

  if(level === operatorPrecenence.length) {
    // We're down to the most basic level: no binary operators left
    const firstToken: Token = tokensClone.next();

    if(firstToken.type === 'number') {
      const expression: Expression = {
        kind: 'numeric',
        resultType: firstToken.resultType,
        value: firstToken.numericValue,
        position: {
          start: firstToken.position,
          end: firstToken.position,
        },
      };

      return {
        error: false,
        expression,
        tokensAfter: tokensClone,
        lastToken: firstToken,
      };
    }

    if(firstToken.type === 'identifier') {
      const secondToken: Token = tokensClone.peekNext();

      if(secondToken.value === '(') {
        // If a parenthesis follows an identifier, we have a function call
        // Consume the opening parenthesis
        tokensClone.next();

        const argumentValues: Expression[] = [];

        while(true) {
          if(tokensClone.peekNext().value === ')') {
            // Last argument value has been parsed, finish
            break;
          }

          argumentValues.push(parseExpression(tokensClone));

          if(tokensClone.peekNext().value === ',') {
            // Consume trailing comma
            tokensClone.next();
          }
        }

        const closingParethesis: Token = tokensClone.next();
        expect(closingParethesis, ')');

        const expression: Expression = {
          kind: 'functionCall',
          functionIdentifier: firstToken.value,
          argumentValues,
          position: {
            start: firstToken.position,
            end: closingParethesis.position,
          },
        };

        return {
          error: false,
          expression,
          tokensAfter: tokensClone,
          lastToken: closingParethesis,
        };
      }

      // Otherwise we have a simple identifier statement
      const expression: Expression = {
        kind: 'identifier',
        identifier: firstToken.value,
        position: {
          start: firstToken.position,
          end: firstToken.position,
        },
      };

      return {
        error: false,
        expression,
        tokensAfter: tokensClone,
        lastToken: firstToken,
      };
    }

    // Composite expression encountered
    if(firstToken.value === '(') {
      const innerExpressionParsingResult: ExpressionParseResult = parseExpressionInner(tokensClone);

      // Propagate error and try to explore a different branch
      if(innerExpressionParsingResult.error) {
        return innerExpressionParsingResult;
      }

      const closingParethesis: Token = innerExpressionParsingResult.tokensAfter.next();
      expect(closingParethesis, ')');

      const expression: Expression = {
        kind: 'composite',
        value: innerExpressionParsingResult.expression,
        position: {
          start: firstToken.position,
          end: closingParethesis.position,
        },
      };

      return {
        error: false,
        expression,
        tokensAfter: innerExpressionParsingResult.tokensAfter,
        lastToken: closingParethesis,
      };
    }

    // Only unary expression starts with an unary operator
    if(firstToken.type === 'operator'
      && (UnaryOperators as readonly string[]).includes(firstToken.value)) {
      // We can only have the most basic expression after an unary operator.
      // Thus, parse with level == operatorPrecenence.length
      const innerExpressionParsingResult: ExpressionParseResult = parseExpressionInner(
        tokensClone,
        operatorPrecenence.length
      );

      if(innerExpressionParsingResult.error) {
        return innerExpressionParsingResult;
      }

      const expression: Expression = {
        kind: 'unaryOperator',
        operator: firstToken.value as typeof UnaryOperators[number],
        value: innerExpressionParsingResult.expression,
        position: {
          start: firstToken.position,
          end: innerExpressionParsingResult.lastToken.position,
        }
      };

      return {
        error: false,
        expression,
        tokensAfter: innerExpressionParsingResult.tokensAfter,
        lastToken: innerExpressionParsingResult.lastToken,
      };
    }

    return { error: true, failingToken: firstToken };
  }

  // From now on, the only option is the binary operator expression (or the end of the expression).
  const leftmost: ExpressionParseResult = parseExpressionInner(tokens, level + 1);

  // Propagate error if encountered
  if(leftmost.error) {
    return leftmost;
  }

  let result: ExpressionParseResult = leftmost;

  while(true) {
    const nextToken: Token = result.tokensAfter.peekNext();

    // If we don't see the operator with correct precenence
    if(!(operatorPrecenence as readonly string[][])[level].includes(nextToken.value)) {
      // We're either at the end of the expression (next token is not an operator of any precenence)
      if(!(BinaryOperators as readonly string[]).includes(nextToken.value)) {
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

    // Propagate error if encountered
    if(nextPart.error) {
      return nextPart;
    }

    const expression: Expression = {
      kind: 'binaryOperator',
      left: result.expression,
      right: nextPart.expression,
      operator,
      position: {
        start: leftmost.expression.position.start,
        end: nextPart.lastToken.position,
      }
    };

    result = {
      error: false,
      expression,
      tokensAfter: nextPart.tokensAfter,
      lastToken: nextPart.lastToken,
    };
  }
}
