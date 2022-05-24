import {
  BinaryOperatorExpression,
  CompositeExpression,
  FunctionCallExpression,
  IdentifierExpression,
  NumericExpression,
  TypeConversionExpression,
  UnaryOperatorExpression,
} from "../ast/Expression.ts";
import { NonVoidBasicType, NonVoidType, Type } from "../ast/Type.ts";

export interface TypedIdentifierExpression extends IdentifierExpression {
  resultType: NonVoidType;
}

export interface TypedNumericExpression extends NumericExpression {
  resultType: NonVoidBasicType;
}

export interface TypedFunctionCallExpression extends FunctionCallExpression {
  resultType: Type;

  argumentValues: TypedExpression[];
}

export interface TypedUnaryOperatorExpression extends UnaryOperatorExpression {
  resultType: NonVoidType;

  value: TypedExpression;
}

export interface TypedBinaryOperatorExpression
  extends BinaryOperatorExpression {
  resultType: Type; // Assignment operator returns void

  left: TypedExpression;
  right: TypedExpression;
}

export interface TypedCompositeExpression extends CompositeExpression {
  resultType: Type;

  value: TypedExpression;
}

export interface TypedTypeConversionExpression
  extends TypeConversionExpression {
  resultType: NonVoidType;

  valueToConvert: TypedExpression;
}

/**
 * Each expression returns a value of certain type.
 * This result type is determined and set during the validation stage.
 */
export type TypedExpression = (
  | TypedIdentifierExpression
  | TypedNumericExpression
  | TypedFunctionCallExpression
  | TypedUnaryOperatorExpression
  | TypedBinaryOperatorExpression
  | TypedCompositeExpression
  | TypedTypeConversionExpression
);
