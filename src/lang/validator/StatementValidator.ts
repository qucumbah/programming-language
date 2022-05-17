import Func from "../ast/Func.ts";
import Statement,{ VariableDeclarationStatement,VariableAssignmentStatement,ReturnStatement,ConditionalStatement,LoopStatement } from "../ast/Statement.ts";
import Type, { isSameType, NonVoidType } from "../ast/Type.ts";
import { Environment,lookupVariableOrParameter,createEmptyEnvironment } from "./Environment.ts";
import { throwValidationError } from "./ErrorUtil.ts";
import { validateExpression } from "./ExpressionValidator.ts";
import { TypedExpression } from "../typedAst/TypedExpression.ts";
import { VariableOrParameterInfo } from "./VariableOrParameterInfo.ts";
import TypedStatement,{ TypedVariableDeclarationStatement,TypedVariableAssignmentStatement,TypedReturnStatement,TypedConditionalStatement,TypedLoopStatement } from "../typedAst/TypedStatement.ts";

export function validateStatement(
  statement: Statement,
  func: Func,
  environment: Environment,
  funcs: Map<string, Func>,
): TypedStatement {
  switch (statement.kind) {
    case 'variableDeclaration': return validateVariableDeclaration(statement, environment, funcs);
    case 'variableAssignment': return validateVariableAssignment(statement, environment, funcs);
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

  if (statement.variableType.value === 'void') {
    // TODO: add positions to statements
    // TODO: add unit test for void variable type
    throw new Error(`Cannot declare variable with type void: ${statement.variableIdentifier}`);
    // throwValidationError('Cannot declare variable with type void', statement);
  }

  const expressionValidationResult: TypedExpression = validateExpression(
    statement.value,
    environment,
    funcs,
  );

  if (!isSameType(expressionValidationResult.resultType, statement.variableType)) {
    // TODO: type to string beautification
    throw new Error(`Cannot assign value of type ${expressionValidationResult.resultType.value} to a variable of type ${statement.variableType.value}`);
  }

  // This is the only way ts compiler understands that variable type is non-void
  const variableType: NonVoidType = (statement.variableType.kind === 'pointer') ? {
    kind: 'pointer',
    value: statement.variableType.value,
    canBeVoid: false,
  } : {
    kind: 'basic',
    value: statement.variableType.value,
    canBeVoid: false,
  };

  const variableInfo: VariableOrParameterInfo = {
    kind: 'variable',
    declarationStatement: statement,
    type: variableType,
  };

  // From now on, the variable type just changes
  // This change will only affect the current scope
  environment.variablesAndParameters.set(statement.variableIdentifier, variableInfo);

  return {
    ...statement,
    variableType,
    value: expressionValidationResult,
  };
}

export function validateVariableAssignment(
  statement: VariableAssignmentStatement,
  environment: Environment,
  funcs: Map<string, Func>,
): TypedVariableAssignmentStatement {
  const variableLookupResult: VariableOrParameterInfo | null = lookupVariableOrParameter(
    statement.variableIdentifier,
    environment,
  );

  if (variableLookupResult === null) {
    throw new Error(`Trying to assign a value to an unknown variable ${statement.variableIdentifier}`);
  }

  if (
    variableLookupResult.kind === 'variable'
    && variableLookupResult.declarationStatement.variableKind === 'constant'
  ) {
    throw new Error(`Trying to assign a value to a constant ${statement.variableIdentifier}`);
  }

  // All parameters are constant, we can't assign values to them
  if (variableLookupResult.kind === 'parameter') {
    throw new Error(`Trying to assign a value to a parameter ${statement.variableIdentifier}`);
  }

  const variableType: Type = variableLookupResult.type;

  const expressionValidationResult: TypedExpression = validateExpression(
    statement.value,
    environment,
    funcs,
  );

  if (expressionValidationResult.resultType.value !== variableType.value) {
    throw new Error(`Cannot assign value of type ${expressionValidationResult.resultType.value} to a variable of type ${variableType.value}`);
  }

  return {
    ...statement,
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
    if (expectedType.value === 'void') {
      return {
        ...statement,
        value: null,
      };
    }

    throw new Error(`Trying to return a void value from a function with type ${expectedType}`);
  }

  const expressionValidationResult: TypedExpression = validateExpression(
    statement.value,
    environment,
    funcs,
  );

  if (!isSameType(expressionValidationResult.resultType, expectedType)) {
    throw new Error(`Cannot return value of type ${expressionValidationResult.resultType.value} from a function of type ${expectedType.value}`);
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

  if (conditionValidationResult.resultType.value !== 'i32') {
    throw new Error(`Expected i32 type in condition. Found ${conditionValidationResult.resultType.value}`);
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

  if (conditionValidationResult.resultType.value !== 'i32') {
    throw new Error(`Expected i32 type in loop condition. Found ${conditionValidationResult.resultType.value}`);
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
