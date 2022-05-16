import Type from "../ast/Type.ts";
import Expression, { BinaryOperatorExpression,FunctionCallExpression,IdentifierExpression,NumericExpression,UnaryOperatorExpression } from "../ast/Expression.ts";
import Func from "../ast/Func.ts";
import { Environment,lookupVariableOrParameter } from "./Environment.ts";
import { VariableOrParameterInfo } from "./VariableOrParameterInfo.ts";
import ParameterDeclaration from "../ast/ParameterDeclaration.ts";

export type ExpressionValidationResult = {
  resultType: Type,
};

/**
 * Validates the given expression by going down the tree and checking the result types of each
 * subexpression. Sets the 'resultType' property of the expression.
 * @param expression expression to validate
 * @param environment environment of the expression
 * @param funcs a list of available functions
 * @returns expression validation result
 */
export function validateExpression(
  expression: Expression,
  environment: Environment,
  funcs: Map<string, Func>,
): ExpressionValidationResult {
  const validationResult: ExpressionValidationResult = validateExpressionWithoutSettingResultType(
    expression,
    environment,
    funcs,
  );

  expression.resultType = validationResult.resultType;

  return validationResult;
}

/**
 * Same as `validateExpression`, but doesn't set the `resultType` field of the given expression,
 * only returns the validation result.
 */
export function validateExpressionWithoutSettingResultType(
  expression: Expression,
  environment: Environment,
  funcs: Map<string, Func>,
): ExpressionValidationResult {
  switch (expression.kind) {
    case 'numeric': return validateNumericExpression(expression);
    case 'identifier': return validateIdentifierExpression(expression, environment);
    case 'composite': return validateExpression(expression.value, environment, funcs);
    case 'functionCall': return validateFunctionCallException(expression, environment, funcs);
    case 'unaryOperator': return validateUnaryOperatorExpression(expression, environment, funcs);
    case 'binaryOperator': return validateBinaryOperatorExpression(expression, environment, funcs);
  }
}

export function validateNumericExpression(
  expression: NumericExpression,
): ExpressionValidationResult {
  // TODO: this is wrong
  if (expression.resultType === 'i32') {
    return { resultType: 'i32' };
  } else if (expression.resultType === 'f32') {
    return { resultType: 'f32' };
  }

  throw new Error(`Internal error: expression return type is void.`);
}

export function validateIdentifierExpression(
  expression: IdentifierExpression,
  environment: Environment,
): ExpressionValidationResult {
  const lookupResult: VariableOrParameterInfo | null = lookupVariableOrParameter(
    expression.identifier,
    environment,
  );
  if (lookupResult === null) {
    throwExpressionValidationError(`Unknown identifier: ${expression.identifier}`, expression);
  }

  return {
    resultType: lookupResult.type,
  };
}

export function validateFunctionCallException(
  expression: FunctionCallExpression,
  environment: Environment,
  funcs: Map<string, Func>,
): ExpressionValidationResult {
  if (!funcs.has(expression.functionIdentifier)) {
    throwExpressionValidationError(
      `Unknown function: ${expression.functionIdentifier}`,
      expression,
    );
  }

  const func: Func = funcs.get(expression.functionIdentifier) as Func;

  if (func.parameters.length !== expression.argumentValues.length) {
    throwExpressionValidationError(
      `Function ${func.name} expects exactly ${func.parameters.length} arguments. Provided ${expression.argumentValues.length}`,
      expression,
    );
  }

  for (let i = 0; i < expression.argumentValues.length; i += 1) {
    const argumentValue: Expression = expression.argumentValues[i];
    const argumentValueValidationResult: ExpressionValidationResult = validateExpression(
      argumentValue,
      environment,
      funcs,
    );

    const parameterDescriptor: ParameterDeclaration = func.parameters[i];

    if (argumentValueValidationResult.resultType !== parameterDescriptor.type) {
      throwExpressionValidationError(
        `Expected argument of type ${parameterDescriptor.type}, received ${argumentValueValidationResult.resultType}`,
        argumentValue,
      );
    }
  }

  return {
    resultType: func.type,
  };
}

function validateUnaryOperatorExpression(
  expression: UnaryOperatorExpression,
  environment: Environment,
  funcs: Map<string, Func>,
): ExpressionValidationResult {
  // TODO: when more types are added, check if operator can be applied to type
  return validateExpression(expression.value, environment, funcs);
}

function validateBinaryOperatorExpression(
  expression: BinaryOperatorExpression,
  environment: Environment,
  funcs: Map<string, Func>,
): ExpressionValidationResult {
  const leftPartValidationResult: ExpressionValidationResult = validateExpression(
    expression.left,
    environment,
    funcs,
  );
  const rightPartValidationResult: ExpressionValidationResult = validateExpression(
    expression.right,
    environment,
    funcs,
  );

  if (leftPartValidationResult.resultType !== rightPartValidationResult.resultType) {
    throwExpressionValidationError(
      `Cannot apply operator ${expression.operator} to different types: ${leftPartValidationResult.resultType} and ${rightPartValidationResult.resultType}`,
      expression,
    );
  }

  return leftPartValidationResult;
}

function throwExpressionValidationError(message: string, expression: Expression): never {
  throw new Error(`${message} Position: line ${expression.position.start.line}, col ${expression.position.start.colStart}`);
}
