import Func from "../ast/Func.ts";
import Statement,{ VariableDeclarationStatement,ReturnStatement,ConditionalStatement,LoopStatement } from "../ast/Statement.ts";
import Type, { isSameType, NonVoidType, stringifyType } from "../ast/Type.ts";
import { Environment,lookupVariableOrParameter,createEmptyEnvironment } from "./Environment.ts";
import { throwValidationError } from "./ErrorUtil.ts";
import { validateExpression } from "./ExpressionValidator.ts";
import { TypedExpression } from "../typedAst/TypedExpression.ts";
import { VariableOrParameterInfo } from "./VariableOrParameterInfo.ts";
import TypedStatement,{ TypedVariableDeclarationStatement,TypedReturnStatement,TypedConditionalStatement,TypedLoopStatement } from "../typedAst/TypedStatement.ts";

export function validateStatement(
  statement: Statement,
  func: Func,
  environment: Environment,
  funcs: Map<string, Func>,
): TypedStatement {
  switch (statement.kind) {
    case 'variableDeclaration': return validateVariableDeclaration(statement, environment, funcs);
    case 'return': return validateReturn(statement, func.type, environment, funcs);
    case 'conditional': return validateConditional(statement, func, environment, funcs);
    case 'loop': return validateLoop(statement, func, environment, funcs);
    // Only need to validate the inner expression, everything else stays the same
    case 'expression': return {
      ...statement,
      value: validateExpression(statement.value, environment, funcs),
    };
  }
}

export function validateVariableDeclaration(
  statement: VariableDeclarationStatement,
  environment: Environment,
  funcs: Map<string, Func>,
): TypedVariableDeclarationStatement {
  // Don't check if variable already exists in environment since re-declaration is allowed

  // TODO: add positions to statements
  // TODO: add unit test for void variable type

  const expressionValidationResult: TypedExpression = validateExpression(
    statement.value,
    environment,
    funcs,
  );

  if (!isSameType(expressionValidationResult.resultType, statement.variableType)) {
    // TODO: type to string beautification
    throw new Error(`Cannot assign value of type ${stringifyType(expressionValidationResult.resultType)} to a variable of type ${stringifyType(statement.variableType)}`);
  }

  const variableInfo: VariableOrParameterInfo = {
    kind: 'variable',
    declarationStatement: statement,
    type: statement.variableType,
  };

  // From now on, the variable type just changes
  // This change will only affect the current scope
  environment.variablesAndParameters.set(statement.variableIdentifier, variableInfo);

  return {
    ...statement,
    variableType: statement.variableType,
    value: expressionValidationResult,
  };
}

export function validateReturn(
  statement: ReturnStatement,
  expectedType: Type,
  environment: Environment,
  funcs: Map<string, Func>,
): TypedReturnStatement {
  if (statement.value === null) {
    if (expectedType.kind === 'void') {
      return {
        ...statement,
        value: null,
      };
    }

    throw new Error(`Trying to return a void value from a function with type ${stringifyType(expectedType)}`);
  }

  const expressionValidationResult: TypedExpression = validateExpression(
    statement.value,
    environment,
    funcs,
  );

  if (!isSameType(expressionValidationResult.resultType, expectedType)) {
    throw new Error(`Cannot return value of type ${stringifyType(expressionValidationResult.resultType)} from a function of type ${stringifyType(expectedType)}`);
  }

  return {
    ...statement,
    value: expressionValidationResult,
  };
}

export function validateConditional(
  statement: ConditionalStatement,
  func: Func,
  environment: Environment,
  funcs: Map<string, Func>,
): TypedConditionalStatement {
  const conditionValidationResult: TypedExpression = validateExpression(
    statement.condition,
    environment,
    funcs,
  );

  if (conditionValidationResult.resultType.kind !== 'basic' || conditionValidationResult.resultType.value !== 'i32') {
    throw new Error(`Expected i32 type in condition. Found ${stringifyType(conditionValidationResult.resultType)}`);
  }

  const innerEnvironment: Environment = createEmptyEnvironment(environment);

  const typedBodyStatements: TypedStatement[] = [];

  let returnStatementEncountered = false;
  for (const innerStatement of statement.body) {
    if (returnStatementEncountered) {
      throw new Error(`Unreachable statement`);
    }

    const statementValidationResult: TypedStatement = validateStatement(
      innerStatement,
      func,
      innerEnvironment,
      funcs,
    );
    typedBodyStatements.push(statementValidationResult);

    if (innerStatement.kind === 'return') {
      returnStatementEncountered = true;
    }
  }

  return {
    ...statement,
    condition: conditionValidationResult,
    body: typedBodyStatements,
  };
}

export function validateLoop(
  statement: LoopStatement,
  func: Func,
  environment: Environment,
  funcs: Map<string, Func>,
): TypedLoopStatement {
  const conditionValidationResult: TypedExpression = validateExpression(
    statement.condition,
    environment,
    funcs,
  );

  if (conditionValidationResult.resultType.kind !== 'basic' || conditionValidationResult.resultType.value !== 'i32') {
    throw new Error(`Expected i32 type in condition. Found ${stringifyType(conditionValidationResult.resultType)}`);
  }

  const innerEnvironment: Environment = createEmptyEnvironment(environment);

  const typedBodyStatements: TypedStatement[] = [];

  let returnStatementEncountered = false;
  for (const innerStatement of statement.body) {
    if (returnStatementEncountered) {
      throw new Error(`Unreachable statement`);
    }

    const statementValidationResult: TypedStatement = validateStatement(
      innerStatement,
      func,
      innerEnvironment,
      funcs,
    );
    typedBodyStatements.push(statementValidationResult);

    if (innerStatement.kind === 'return') {
      returnStatementEncountered = true;
    }
  }

  return {
    ...statement,
    condition: conditionValidationResult,
    body: typedBodyStatements,
  };
}
