import { isSameType, NonVoidType, stringifyType } from "../ast/Type.ts";
import Expression, {
  BinaryOperatorExpression,
  FunctionCallExpression,
  IdentifierExpression,
  NumericExpression,
  TypeConversionExpression,
  UnaryOperatorExpression,
} from "../ast/Expression.ts";
import Func from "../ast/Func.ts";
import { Environment, lookupVariableOrParameter } from "./Environment.ts";
import { VariableOrParameterInfo } from "./VariableOrParameterInfo.ts";
import ParameterDeclaration from "../ast/ParameterDeclaration.ts";
import {
  TypedBinaryOperatorExpression,
  TypedExpression,
  TypedFunctionCallExpression,
  TypedIdentifierExpression,
  TypedNumericExpression,
  TypedTypeConversionExpression,
  TypedUnaryOperatorExpression,
} from "../typedAst/TypedExpression.ts";
import ValidationError from "./ValidationError.ts";
import { assert } from "../Assert.ts";

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
    case "numeric":
      return validateNumericExpression(expression);
    case "identifier":
      return validateIdentifierExpression(expression, environment);
    case "composite":
      return validateExpression(expression.value, environment, funcs);
    case "functionCall":
      return validateFunctionCallException(expression, environment, funcs);
    case "unaryOperator":
      return validateUnaryOperatorExpression(expression, environment, funcs);
    case "binaryOperator":
      return validateBinaryOperatorExpression(expression, environment, funcs);
    case "typeConversion":
      return validateTypeConversionExpression(expression, environment, funcs);
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
  const lookupResult: VariableOrParameterInfo | null =
    lookupVariableOrParameter(
      expression.identifier,
      environment,
    );

  if (lookupResult === null) {
    throw new ValidationError(
      `Unknown identifier: ${expression.identifier}`,
      expression,
    );
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
    throw new ValidationError(
      `Unknown function: ${expression.functionIdentifier}`,
      expression,
    );
  }

  const func: Func = funcs.get(expression.functionIdentifier) as Func;

  if (func.signature.parameters.length !== expression.argumentValues.length) {
    throw new ValidationError(
      `Function ${func.signature.name} expects exactly ${func.signature.parameters.length} arguments. Provided ${expression.argumentValues.length}`,
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

    const parameterDescriptor: ParameterDeclaration =
      func.signature.parameters[i];

    if (
      !isSameType(
        argumentValueValidationResult.resultType,
        parameterDescriptor.type,
      )
    ) {
      throw new ValidationError(
        `Expected argument of type ${
          stringifyType(argumentValueValidationResult.resultType)
        }, received ${stringifyType(parameterDescriptor.type)}`,
        argumentValue,
      );
    }

    typedArgumentValues.push(argumentValueValidationResult);
  }

  return {
    ...expression,
    argumentValues: typedArgumentValues,
    resultType: func.signature.type,
  };
}

function validateUnaryOperatorExpression(
  expression: UnaryOperatorExpression,
  environment: Environment,
  funcs: Map<string, Func>,
): TypedUnaryOperatorExpression {
  switch (expression.operator) {
    case "-":
      return validateUnaryMinusExpression(expression, environment, funcs);
    case "@":
      return validateDereferenceExpression(expression, environment, funcs);
    case "!":
      return validateLogicalNotExpression(expression, environment, funcs);
  }
}

function validateUnaryMinusExpression(
  expression: UnaryOperatorExpression,
  environment: Environment,
  funcs: Map<string, Func>,
): TypedUnaryOperatorExpression {
  assert(
    expression.operator === "-",
    "validating unary minus expression with incorrect operator",
  );
  const typedOperand: TypedExpression = validateExpression(
    expression.value,
    environment,
    funcs,
  );

  if (typedOperand.resultType.kind === "void") {
    throw new ValidationError(
      "Unary operation cannot be performed on void",
      expression,
    );
  }

  const result: TypedUnaryOperatorExpression = {
    ...expression,
    value: typedOperand,
    resultType: typedOperand.resultType,
  };

  return result;
}

function validateDereferenceExpression(
  expression: UnaryOperatorExpression,
  environment: Environment,
  funcs: Map<string, Func>,
): TypedUnaryOperatorExpression {
  assert(
    expression.operator === "@",
    "validating dereference expression with incorrect operator",
  );
  const typedOperand: TypedExpression = validateExpression(
    expression.value,
    environment,
    funcs,
  );

  if (typedOperand.resultType.kind !== "pointer") {
    throw new ValidationError("Cannot dereference a non-pointer", expression);
  }

  const result: TypedUnaryOperatorExpression = {
    ...expression,
    value: typedOperand,
    resultType: typedOperand.resultType.value,
  };

  return result;
}

function validateLogicalNotExpression(
  expression: UnaryOperatorExpression,
  environment: Environment,
  funcs: Map<string, Func>,
): TypedUnaryOperatorExpression {
  assert(
    expression.operator === "-",
    "validating logical not expression with incorrect operator",
  );
  const typedOperand: TypedExpression = validateExpression(
    expression.value,
    environment,
    funcs,
  );

  if (typedOperand.resultType.kind !== "basic" || typedOperand.resultType.value !== "i32") {
    throw new ValidationError("Cannot apply logical not to a non-boolean value", expression);
  }

  const result: TypedUnaryOperatorExpression = {
    ...expression,
    value: typedOperand,
    resultType: {
      kind: "basic",
      value: "i32",
    },
  };

  return result;
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

  if (expression.operator === "=") {
    if (leftPartValidationResult.kind === "identifier") {
      return validateVariableAssignmentExpression(
        expression,
        environment,
        leftPartValidationResult,
        rightPartValidationResult,
      );
    } else if (
      (leftPartValidationResult.kind === "unaryOperator") &&
      (leftPartValidationResult.operator === "@")
    ) {
      return validatePointerAssignmentExpression(
        expression,
        leftPartValidationResult,
        rightPartValidationResult,
      );
    } else {
      throw new ValidationError("Invalid assignment to expression", expression);
    }
  }

  if (
    (leftPartValidationResult.resultType.kind === "void") ||
    (rightPartValidationResult.resultType.kind === "void")
  ) {
    throw new ValidationError(
      "Binary operation cannot be performed on void",
      expression,
    );
  }

  if (
    !isSameType(
      leftPartValidationResult.resultType,
      rightPartValidationResult.resultType,
    )
  ) {
    throw new ValidationError(
      `Cannot apply operator ${expression.operator} to different types: ${
        stringifyType(leftPartValidationResult.resultType)
      } and ${stringifyType(rightPartValidationResult.resultType)}`,
      expression,
    );
  }

  let resultType: NonVoidType;
  switch (expression.operator) {
    case "+":
    case "-":
    case "*":
    case "/":
      resultType = leftPartValidationResult.resultType;
      break;
    case "==":
    case "!=":
    case ">":
    case "<":
    case ">=":
    case "<=":
    case "&&":
    case "||":
      resultType = {
        kind: "basic",
        value: "i32",
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

function validateVariableAssignmentExpression(
  expression: BinaryOperatorExpression,
  environment: Environment,
  leftPartValidationResult: TypedExpression,
  rightPartValidationResult: TypedExpression,
): TypedBinaryOperatorExpression {
  assert(expression.operator === "=");
  assert(leftPartValidationResult.kind === "identifier");

  if (rightPartValidationResult.resultType.kind === "void") {
    throw new ValidationError("Invalid assignment of void value", expression);
  }

  if (
    !isSameType(
      leftPartValidationResult.resultType,
      rightPartValidationResult.resultType,
    )
  ) {
    throw new ValidationError(
      `Cannot assign value of type ${
        stringifyType(rightPartValidationResult.resultType)
      } to a variable of type ${
        stringifyType(leftPartValidationResult.resultType)
      }`,
      expression,
    );
  }

  const variableLookupResult: VariableOrParameterInfo | null =
    lookupVariableOrParameter(
      leftPartValidationResult.identifier,
      environment,
    );

  if (variableLookupResult === null) {
    throw new ValidationError(
      `Trying to assign a value to an unknown variable ${leftPartValidationResult.identifier}`,
      expression,
    );
  }

  if (
    variableLookupResult.kind === "variable" &&
    variableLookupResult.declarationStatement.variableKind === "constant"
  ) {
    throw new ValidationError(
      `Trying to assign a value to a constant ${leftPartValidationResult.identifier}`,
      expression,
    );
  }

  // All parameters are constant, we can't assign values to them
  if (variableLookupResult.kind === "parameter") {
    throw new ValidationError(
      `Trying to assign a value to a parameter ${leftPartValidationResult.identifier}`,
      expression,
    );
  }

  return {
    ...expression,
    left: leftPartValidationResult,
    right: rightPartValidationResult,
    resultType: { kind: "void" },
  };
}

function validatePointerAssignmentExpression(
  expression: BinaryOperatorExpression,
  leftPartValidationResult: TypedExpression,
  rightPartValidationResult: TypedExpression,
): TypedBinaryOperatorExpression {
  assert(expression.operator === "=");
  assert(leftPartValidationResult.kind === "unaryOperator");
  assert(leftPartValidationResult.operator === "@");
  assert(leftPartValidationResult.value.resultType.kind === "pointer");

  if (rightPartValidationResult.resultType.kind === "void") {
    throw new ValidationError("Invalid assignment of void value", expression);
  }

  // Compare whatever type the LHS points to to the value's type
  if (
    !isSameType(
      leftPartValidationResult.resultType,
      rightPartValidationResult.resultType,
    )
  ) {
    throw new ValidationError(
      `Cannot assign value of type ${
        stringifyType(rightPartValidationResult.resultType)
      } to a pointer to ${stringifyType(leftPartValidationResult.resultType)}`,
      expression,
    );
  }

  return {
    ...expression,
    left: leftPartValidationResult,
    right: rightPartValidationResult,
    resultType: { kind: "void" },
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

  if (valueToConvertValidationResult.resultType.kind === "void") {
    throw new ValidationError(
      "Cannot typecast expression with type void",
      expression,
    );
  }

  return {
    ...expression,
    valueToConvert: valueToConvertValidationResult,
  };
}
