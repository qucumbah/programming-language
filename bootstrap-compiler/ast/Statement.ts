import Expression from './Expression.ts';
import Type from './Type.ts';

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
export interface ConditionalStatement {
  type: 'conditional',
  condition: Expression,
  body: Statement[],
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
export interface LoopStatement {
  type: 'loop',
  condition: Expression,
  body: Statement[],
}

/**
 * Return statement only includes the value to return, e.g.:
 * ```
 * // Return some expression
 * return 5 + 3;
 * ```
 */
export interface ReturnStatement {
  type: 'return',
  value: Expression,
}

/**
 * Variable declaration statement includes the new variable identifier, type and the assigned value.
 * Example:
 * ```
 * // For now, we have to assign at least some value (expression) to the variable
 * var varName: i32 = someFunctionCall(15);
 * ```
 */
export interface VariableDeclarationStatement {
  type: 'variableDeclaration',
  variableIdentifier: string,
  variableType: Type,
  value: Expression,
}

/**
 * Expression statement only consists of an expression. Example:
 * ```
 * someFunc(1, 2, 3); // Function call is an expression and a statement at the same time
 * 1 + 2 + 3; // This is also a valid statement
 * ```
 */
export interface ExpressionStatement {
  type: 'expression',
  value: Expression,
}

/**
 * Common type for all statement variations
 */
type Statement = (
  ConditionalStatement
  | LoopStatement
  | ReturnStatement
  | VariableDeclarationStatement
  | ExpressionStatement
);

export default Statement;
