import { UnaryOperators, BinaryOperators } from '../Lexer.ts';

export interface IdentifierExpression {
  type: 'identifier',
  identifier: string,
}

export interface NumericExpression {
  type: 'numeric',
  value: string,
}

export interface FunctionCallExpression {
  type: 'functionCall',
  functionIdentifier: string,
  argumentValues: Expression[],
}

export interface UnaryOperatorExpression {
  type: 'unaryOperator',
  operator: typeof UnaryOperators[number],
  value: Expression,
}

export interface BinaryOperatorExpression {
  type: 'binaryOperator',
  operator: typeof BinaryOperators[number],
  left: Expression,
  right: Expression,
}

export interface CompositeExpression {
  type: 'composite',
  value: Expression,
}

type Expression = (
  IdentifierExpression
  | NumericExpression
  | FunctionCallExpression
  | UnaryOperatorExpression
  | BinaryOperatorExpression
  | CompositeExpression
);

export default Expression;
