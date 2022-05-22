import { IdentifierExpression,NumericExpression,FunctionCallExpression,UnaryOperatorExpression,BinaryOperatorExpression,CompositeExpression, TypeConversionExpression } from "../ast/Expression.ts";
import { NonVoidBasicType, NonVoidType, PossiblyVoidType } from "../ast/Type.ts";

export interface TypedIdentifierExpression extends IdentifierExpression {
  resultType: NonVoidType;
}

export interface TypedNumericExpression extends NumericExpression {
  resultType: NonVoidBasicType;
}

export interface TypedFunctionCallExpression extends FunctionCallExpression {
  resultType: PossiblyVoidType;

  argumentValues: TypedExpression[];
}

export interface TypedUnaryOperatorExpression extends UnaryOperatorExpression {
  resultType: NonVoidBasicType;

  value: TypedExpression;
}

export interface TypedBinaryOperatorExpression extends BinaryOperatorExpression {
  resultType: NonVoidBasicType;

  left: TypedExpression;
  right: TypedExpression;
}

export interface TypedCompositeExpression extends CompositeExpression {
  resultType: PossiblyVoidType

  value: TypedExpression;
}

export interface TypedTypeConversionExpression extends TypeConversionExpression {
  valueToConvert: TypedExpression;
  resultType: NonVoidType;
}

/**
 * Each expression returns a value of certain type.
 * This result type is determined and set during the validation stage.
 */
export type TypedExpression = (
  TypedIdentifierExpression
  | TypedNumericExpression
  | TypedFunctionCallExpression
  | TypedUnaryOperatorExpression
  | TypedBinaryOperatorExpression
  | TypedCompositeExpression
  | TypedTypeConversionExpression
);
