import { ConditionalStatement,LoopStatement,ReturnStatement,VariableDeclarationStatement,ExpressionStatement } from "../ast/Statement.ts";
import { NonVoidType } from "../ast/Type.ts";
import { TypedExpression } from "./TypedExpression.ts";

export interface TypedConditionalStatement extends ConditionalStatement {
  condition: TypedExpression;
  body: TypedStatement[];
}

export interface TypedLoopStatement extends LoopStatement {
  condition: TypedExpression;
  body: TypedStatement[];
}

export interface TypedReturnStatement extends ReturnStatement {
  value: TypedExpression | null;
}

export interface TypedVariableDeclarationStatement extends VariableDeclarationStatement {
  variableType: NonVoidType;
  value: TypedExpression;
}

export interface TypedExpressionStatement extends ExpressionStatement {
  value: TypedExpression;
}

type TypedStatement = (
  TypedConditionalStatement
  | TypedLoopStatement
  | TypedReturnStatement
  | TypedVariableDeclarationStatement
  | TypedExpressionStatement
);

export default TypedStatement;
