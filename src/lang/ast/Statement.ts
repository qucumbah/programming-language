import { TokenSequencePosition } from "../lexer/Token.ts";
import Expression from "./Expression.ts";
import Type, { NonVoidType } from "./Type.ts";

/**
 * Fields that are common for all statement types
 */
interface CommonInfo {
  /**
   * Each statement starts and ends with a token.
   */
  position: TokenSequencePosition;
}

/**
 * Conditional statement consists of expression to evaluate and the body statements, e.g.:
 * ```
 * if (expression) {
 *   // Body
 *   statement1;
 *   statement2;
 * }
 * ```
 */
export interface ConditionalStatement extends CommonInfo {
  kind: "conditional";
  condition: Expression;
  body: Statement[];
}

/**
 * Loop statement consists of expression to evaluate and the body statements, e.g.:
 * ```
 * while (expression) {
 *   // Body
 *   statement1;
 *   statement2;
 * }
 * ```
 */
export interface LoopStatement extends CommonInfo {
  kind: "loop";
  condition: Expression;
  body: Statement[];
}

/**
 * Return statement only includes the value to return, e.g.:
 * ```
 * // Return some expression
 * return 5 + 3;
 * ```
 */
export interface ReturnStatement extends CommonInfo {
  kind: "return";
  value: Expression | null;
}

/**
 * Variable declaration statement includes the new variable identifier, kind and the assigned value.
 * Example:
 * ```
 * // For now, we have to assign at least some value (expression) to the variable
 * var varName: i32 = someFunctionCall(15);
 * ```
 */
export interface VariableDeclarationStatement extends CommonInfo {
  kind: "variableDeclaration";
  variableIdentifier: string;
  variableType: NonVoidType;
  variableKind: "variable" | "constant";
  value: Expression;
}

/**
 * Expression statement only consists of an expression. Example:
 * ```
 * someFunc(1, 2, 3); // Function call is an expression and a statement at the same time
 * 1 + 2 + 3; // This is also a valid statement
 * ```
 */
export interface ExpressionStatement extends CommonInfo {
  kind: "expression";
  value: Expression;
}

/**
 * Common kind for all statement variations
 */
type Statement = (
  | ConditionalStatement
  | LoopStatement
  | ReturnStatement
  | VariableDeclarationStatement
  | ExpressionStatement
);

export default Statement;
