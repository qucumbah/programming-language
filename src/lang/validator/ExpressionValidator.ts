import { isSameType, NonVoidType, stringifyType } from "../ast/Type.ts";
import Expression, { BinaryOperatorExpression,FunctionCallExpression,IdentifierExpression,NumericExpression,TypeConversionExpression,UnaryOperatorExpression } from "../ast/Expression.ts";
import Func from "../ast/Func.ts";
import { Environment,lookupVariableOrParameter } from "./Environment.ts";
import { VariableOrParameterInfo } from "./VariableOrParameterInfo.ts";
import ParameterDeclaration from "../ast/ParameterDeclaration.ts";
import { assert } from "../Assert.ts";
import { TypedExpression,TypedBinaryOperatorExpression,TypedCompositeExpression,TypedFunctionCallExpression,TypedIdentifierExpression,TypedNumericExpression,TypedUnaryOperatorExpression, TypedTypeConversionExpression } from '../typedAst/TypedExpression.ts';
import { throwValidationError } from "./ErrorUtil.ts";

/**
 * Validates the given expression by going down the tree and checking the result types of each
 * subexpression. Returns typed version of the expression.
 * 
 * @param expression expression to validate
 * @param environment environment of the expression
 * @param funcs a list of available functions
 * @returns typed version of provided expression
 */
export function validateExpression(
  expression: Expression,
  environment: Environment,
  funcs: Map<string, Func>,
): TypedExpression {
  switch (expression.kind) {
    case 'numeric': return validateNumericExpression(expression);
    case 'identifier': return validateIdentifierExpression(expression, environment);
    case 'composite': return validateExpression(expression.value, environment, funcs);
    case 'functionCall': return validateFunctionCallException(expression, environment, funcs);
    case 'unaryOperator': return validateUnaryOperatorExpression(expression, environment, funcs);
    case 'binaryOperator': return validateBinaryOperatorExpression(expression, environment, funcs);
    case 'typeConversion': return validateTypeConversionExpression(expression, environment, funcs);
  }
}

/**
 * Validate numeric expression. This type of expression is self-validating since we know the return
 * type at lexing stage.
 * @param expression numeric expression to validate
 * @returns typed version of the expression
 */
export function validateNumericExpression(
  expression: NumericExpression,
): TypedNumericExpression {
  return {
    ...expression,
    resultType: expression.literalType,
  };
}

export function validateIdentifierExpression(
  expression: IdentifierExpression,
  environment: Environment,
): TypedIdentifierExpression {
  const lookupResult: VariableOrParameterInfo | null = lookupVariableOrParameter(
    expression.identifier,
    environment,
  );

  if (lookupResult === null) {
    throwValidationError(`Unknown identifier: ${expression.identifier}`, expression);
  }

  return {
    ...expression,
    resultType: lookupResult.type,
  };
}

export function validateFunctionCallException(
  expression: FunctionCallExpression,
  environment: Environment,
  funcs: Map<string, Func>,
): TypedFunctionCallExpression {
  if (!funcs.has(expression.functionIdentifier)) {
    throwValidationError(
      `Unknown function: ${expression.functionIdentifier}`,
      expression,
    );
  }

  const func: Func = funcs.get(expression.functionIdentifier) as Func;

  if (func.parameters.length !== expression.argumentValues.length) {
    throwValidationError(
      `Function ${func.name} expects exactly ${func.parameters.length} arguments. Provided ${expression.argumentValues.length}`,
      expression,
    );
  }

  const typedArgumentValues: TypedExpression[] = [];
  for (let i = 0; i < expression.argumentValues.length; i += 1) {
    const argumentValue: Expression = expression.argumentValues[i];
    const argumentValueValidationResult: TypedExpression = validateExpression(
      argumentValue,
      environment,
      funcs,
    );

    const parameterDescriptor: ParameterDeclaration = func.parameters[i];

    if (!isSameType(argumentValueValidationResult.resultType, parameterDescriptor.type)) {
      throwValidationError(
        `Expected argument of type ${stringifyType(argumentValueValidationResult.resultType)}, received ${stringifyType(parameterDescriptor.type)}`,
        expression,
      );
    }

    typedArgumentValues.push(argumentValueValidationResult);
  }

  return {
    ...expression,
    argumentValues: typedArgumentValues,
    resultType: func.type,
  };
}

function validateUnaryOperatorExpression(
  expression: UnaryOperatorExpression,
  environment: Environment,
  funcs: Map<string, Func>,
): TypedUnaryOperatorExpression {
  const typedOperand: TypedExpression = validateExpression(expression.value, environment, funcs);

  if (typedOperand.resultType.kind === 'void') {
    throwValidationError('Unary operation cannot be performed on void', expression);
  }

  const result: TypedUnaryOperatorExpression = {
    ...expression,
    value: typedOperand,
    resultType: typedOperand.resultType,
  };

  // If we add another operator, this switch statement will fail as an indicator of needed change
  switch (expression.operator) {
    case '-': return result;
  }
}

function validateBinaryOperatorExpression(
  expression: BinaryOperatorExpression,
  environment: Environment,
  funcs: Map<string, Func>,
): TypedBinaryOperatorExpression {
  const leftPartValidationResult: TypedExpression = validateExpression(
    expression.left,
    environment,
    funcs,
  );
  const rightPartValidationResult: TypedExpression = validateExpression(
    expression.right,
    environment,
    funcs,
  );

  if (
    (leftPartValidationResult.resultType.kind === 'void')
    || (rightPartValidationResult.resultType.kind === 'void')
  ) {
    throwValidationError('Binary operation cannot be performed on void', expression);
  }

  if (!isSameType(leftPartValidationResult.resultType, rightPartValidationResult.resultType)) {
    throwValidationError(
      `Cannot apply operator ${expression.operator} to different types: ${stringifyType(leftPartValidationResult.resultType)} and ${stringifyType(rightPartValidationResult.resultType)}`,
      expression,
    );
  }

  let resultType: NonVoidType;
  switch (expression.operator) {
    case '+':
    case '-':
    case '*':
    case '/':
      resultType = leftPartValidationResult.resultType;
      break;
    case '==':
    case '!=':
    case '>':
    case '<':
    case '>=':
    case '<=':
      resultType = {
        kind: 'basic',
        value: 'i32',
      };
      break;
  }

  return {
    ...expression,
    left: leftPartValidationResult,
    right: rightPartValidationResult,
    resultType,
  };
}

function validateTypeConversionExpression(
  expression: TypeConversionExpression,
  environment: Environment,
  funcs: Map<string, Func>,
): TypedTypeConversionExpression {
  const valueToConvertValidationResult: TypedExpression = validateExpression(
    expression.valueToConvert,
    environment,
    funcs,
  );

  if (valueToConvertValidationResult.resultType.kind === 'void') {
    throwValidationError('Cannot typecast expression with type void', expression);
  }

  return {
    ...expression,
    valueToConvert: valueToConvertValidationResult,
  };
}
