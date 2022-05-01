import Expression from "./Expression.ts";
import Type from "./Type.ts";

export interface ConditionalStatement {
  type: 'conditional',
  condition: Expression,
  body: Statement[],
}

export interface LoopStatement {
  type: 'loop',
  condition: Expression,
  body: Statement[],
}

export interface ReturnStatement {
  type: 'return',
  value: Expression,
}

export interface VariableDeclarationStatement {
  type: 'variableDeclaration',
  variableIdentifier: string,
  variableType: Type,
  value: Expression,
}

export interface ExpressionStatement {
  type: 'expression',
  value: Expression,
}

type Statement =
  ConditionalStatement
  | LoopStatement
  | ReturnStatement
  | VariableDeclarationStatement
  | ExpressionStatement;

export default Statement;
