import Func from "../ast/Func.ts";
import Statement,{ VariableDeclarationStatement,VariableAssignmentStatement,ReturnStatement,ConditionalStatement,LoopStatement } from "../ast/Statement.ts";
import Type from "../ast/Type.ts";
import { Environment,lookupVariableOrParameter,createEmptyEnvironment } from "./Environment.ts";
import { validateExpression,ExpressionValidationResult } from "./ExpressionValidator.ts";
import { VariableOrParameterInfo } from "./VariableOrParameterInfo.ts";

export function validateStatement(
  statement: Statement,
  func: Func,
  environment: Environment,
  funcs: Map<string, Func>,
): void {
  switch (statement.type) {
    case 'variableDeclaration':
      validateVariableDeclaration(statement, environment, funcs);
      return;
    case 'variableAssignment':
      validateVariableAssignment(statement, environment, funcs);
      return;
    case 'return':
      validateReturn(statement, func.type, environment, funcs);
      return;
    case 'conditional':
      validateConditional(statement, func, environment, funcs);
      return;
    case 'loop':
      validateLoop(statement, func, environment, funcs);
      return;
    case 'expression':
      validateExpression(statement.value, environment, funcs);
      return;
  }
}

export function validateVariableDeclaration(
  statement: VariableDeclarationStatement,
  environment: Environment,
  funcs: Map<string, Func>,
): void {
  // Don't check if variable already exists in environment since re-declaration is allowed

  const expressionValidationResult: ExpressionValidationResult = validateExpression(
    statement.value,
    environment,
    funcs,
  );

  if (expressionValidationResult.resultType !== statement.variableType) {
    throw new Error(`Cannot assign value of type ${expressionValidationResult.resultType} to a variable of type ${statement.variableType}`);
  }

  const variableInfo: VariableOrParameterInfo = {
    kind: 'variable',
    type: statement.variableType,
  };

  // From now on, the variable type just changes
  // This change will only affect the current scope
  environment.variablesAndParameters.set(statement.variableIdentifier, variableInfo);
}

export function validateVariableAssignment(
  statement: VariableAssignmentStatement,
  environment: Environment,
  funcs: Map<string, Func>,
): void {
  const variableLookupResult: VariableOrParameterInfo | null = lookupVariableOrParameter(
    statement.variableIdentifier,
    environment,
  );

  if (variableLookupResult === null) {
    throw new Error(`Trying to assign a value to an unknown variable ${statement.variableIdentifier}`);
  }

  // All parameters are constant, we can't assign values to them
  if (variableLookupResult.kind === 'parameter') {
    throw new Error(`Trying to assign a value to a parameter ${statement.variableIdentifier}`);
  }

  const variableType: Type = variableLookupResult.type;

  const expressionValidationResult: ExpressionValidationResult = validateExpression(
    statement.value,
    environment,
    funcs,
  );

  if (expressionValidationResult.resultType !== variableType) {
    throw new Error(`Cannot assign value of type ${expressionValidationResult.resultType} to a variable of type ${variableType}`);
  }
}

export function validateReturn(
  statement: ReturnStatement,
  expectedType: Type,
  environment: Environment,
  funcs: Map<string, Func>,
): void {
  if (statement.value === null) {
    if (expectedType === 'void') {
      return;
    }

    throw new Error(`Trying to return a void value from a function with type ${expectedType}`);
  }

  const expressionValidationResult: ExpressionValidationResult = validateExpression(
    statement.value,
    environment,
    funcs,
  );

  if (expressionValidationResult.resultType !== expectedType) {
    throw new Error(`Cannot return value of type ${expressionValidationResult.resultType} from a function of type ${expectedType}`);
  }
}

export function validateConditional(
  statement: ConditionalStatement,
  func: Func,
  environment: Environment,
  funcs: Map<string, Func>,
): void {
  const conditionValidationResult: ExpressionValidationResult = validateExpression(
    statement.condition,
    environment,
    funcs,
  );

  if (conditionValidationResult.resultType !== 'i32') {
    throw new Error(`Expected i32 type in condition. Found ${conditionValidationResult.resultType}`);
  }

  const innerEnvironment: Environment = createEmptyEnvironment(environment);

  let returnStatementEncountered = false;
  for (const innerStatement of statement.body) {
    if (returnStatementEncountered) {
      throw new Error(`Unreachable statement`);
    }

    validateStatement(innerStatement, func, innerEnvironment, funcs);

    if (innerStatement.type === 'return') {
      returnStatementEncountered = true;
    }
  }
}

export function validateLoop(
  statement: LoopStatement,
  func: Func,
  environment: Environment,
  funcs: Map<string, Func>,
): void {
  const conditionValidationResult: ExpressionValidationResult = validateExpression(
    statement.condition,
    environment,
    funcs,
  );

  if (conditionValidationResult.resultType !== 'i32') {
    throw new Error(`Expected i32 type in loop condition. Found ${conditionValidationResult.resultType}`);
  }

  const innerEnvironment: Environment = createEmptyEnvironment(environment);

  let returnStatementEncountered = false;
  for (const innerStatement of statement.body) {
    if (returnStatementEncountered) {
      throw new Error(`Unreachable statement`);
    }

    validateStatement(innerStatement, func, innerEnvironment, funcs);

    if (innerStatement.type === 'return') {
      returnStatementEncountered = true;
    }
  }
}
