import { UnaryOperators, BinaryOperators } from '../lexer/Operators.ts';
import Type from "./Type.ts";

/**
 * Each expression returns a value of certain type.
 * This result type is determined and set during the validation stage.
 * NumericExpression is the exception, since for it the result type is determined during parsing.
 */
type ResultType = {
  resultType?: Type,
}

/**
 * Single identifier expression, e.g.:
 * ```
 * // `someBool` is used as an expression
 * if (someBool) {
 *   // Some code
 * }
 * ```
 */
export type IdentifierExpression = {
  kind: 'identifier',
  identifier: string,
} & ResultType

/**
 * Single number expression, e.g.:
 * ```
 * // `1` is used as an expression
 * while (1) {
 *   // Some code
 * }
 * ```
 */
export type NumericExpression = {
  kind: 'numeric',
  value: number,
} & ResultType

/**
 * Function call expression, e.g.:
 * ```
 * // `getValue` and everything that follows until the `;` is a function call expression
 * var someVar: i32 = 15 + getValue(333, identifier, getOtherValue());
 * ```
 */
export type FunctionCallExpression = {
  kind: 'functionCall',
  functionIdentifier: string,
  argumentValues: Expression[],
} & ResultType

/**
 * Unary operator expression. Includes the inner value that the operator should be applied to, e.g.:
 * ```
 * // `!` sign is the inversion unary operator
 * // `compare(5, 6)` value is the inner value of the expression
 * var someVar: i32 = !compare(5, 6);
 * ```
 */
export type UnaryOperatorExpression = {
  kind: 'unaryOperator',
  operator: typeof UnaryOperators[number],
  value: Expression,
} & ResultType

/**
 * Binary operator expression.
 * Includes the right and the left parts for which the operator should be applied to, e.g.:
 * ```
 * // `+` is the binary operator in this context
 * // `5` and `-3` are the left and the right parts of the expression respectively
 * var someVar: i32 = 5 + -3;
 * ```
 */
export type BinaryOperatorExpression = {
  kind: 'binaryOperator',
  operator: typeof BinaryOperators[number],
  left: Expression,
  right: Expression,
} & ResultType

/**
 * Composite expression is an expression inside parentheses, e.g.:
 * ```
 * // `(5 + 3)` is the composite expression, which is needed to fix the operator order
 * var someVar: i32 = (5 + 3) * 2;
 * ```
 */
export type CompositeExpression = {
  kind: 'composite',
  value: Expression,
} & ResultType

/**
 * Common type for all expression variations
 */
type Expression = (
  IdentifierExpression
  | NumericExpression
  | FunctionCallExpression
  | UnaryOperatorExpression
  | BinaryOperatorExpression
  | CompositeExpression
);

export default Expression;
