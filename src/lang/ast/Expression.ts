import { BinaryOperators, UnaryOperators } from "../lexer/Operators.ts";
import { TokenPosition } from "../lexer/Token.ts";
import { NonVoidBasicType, NonVoidType } from "./Type.ts";

/**
 * Fields that are common for all expression types
 */
interface CommonInfo {
  /**
   * Each expression starts and ends with a token.
   */
  position: {
    start: TokenPosition;
    end: TokenPosition;
  };
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
export interface IdentifierExpression extends CommonInfo {
  kind: "identifier";
  identifier: string;
}

/**
 * Single number expression, e.g.:
 * ```
 * // `1` is used as an expression
 * while (1) {
 *   // Some code
 * }
 * ```
 */
export interface NumericExpression extends CommonInfo {
  kind: "numeric";
  value: string;
  /**
   * All numeric literals have non-void basic numeric type.
   */
  literalType: NonVoidBasicType;
}

/**
 * Function call expression, e.g.:
 * ```
 * // `getValue` and everything that follows until the `;` is a function call expression
 * var someVar: i32 = 15 + getValue(333, identifier, getOtherValue());
 * ```
 */
export interface FunctionCallExpression extends CommonInfo {
  kind: "functionCall";
  functionIdentifier: string;
  argumentValues: Expression[];
}

/**
 * Unary operator expression. Includes the inner value that the operator should be applied to, e.g.:
 * ```
 * // `!` sign is the inversion unary operator
 * // `compare(5, 6)` value is the inner value of the expression
 * var someVar: i32 = !compare(5, 6);
 * ```
 */
export interface UnaryOperatorExpression extends CommonInfo {
  kind: "unaryOperator";
  operator: typeof UnaryOperators[number];
  value: Expression;
}

/**
 * Binary operator expression.
 * Includes the right and the left parts for which the operator should be applied to, e.g.:
 * ```
 * // `+` is the binary operator in this context
 * // `5` and `-3` are the left and the right parts of the expression respectively
 * var someVar: i32 = 5 + -3;
 * ```
 */
export interface BinaryOperatorExpression extends CommonInfo {
  kind: "binaryOperator";
  operator: typeof BinaryOperators[number];
  left: Expression;
  right: Expression;
}

/**
 * Composite expression is an expression inside parentheses, e.g.:
 * ```
 * // `(5 + 3)` is the composite expression, which is needed to fix the operator order
 * var someVar: i32 = (5 + 3) * 2;
 * ```
 */
export interface CompositeExpression extends CommonInfo {
  kind: "composite";
  value: Expression;
}

/**
 * Type conversion expression, e.g.:
 * ```
 * // `(5 + 3)` is the composite expression the type of which is converted to u32
 * var someVar: u32 = (5 + 3) as u32;
 * ```
 */
export interface TypeConversionExpression extends CommonInfo {
  kind: "typeConversion";
  valueToConvert: Expression;
  resultType: NonVoidType;
}

/**
 * Common type for all expression variations
 */
type Expression = (
  | IdentifierExpression
  | NumericExpression
  | FunctionCallExpression
  | UnaryOperatorExpression
  | BinaryOperatorExpression
  | CompositeExpression
  | TypeConversionExpression
);

export default Expression;
