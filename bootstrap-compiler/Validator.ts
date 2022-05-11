import Argument from "./ast/Argument.ts";
import Expression, { BinaryOperatorExpression, FunctionCallExpression, IdentifierExpression, NumericExpression, UnaryOperatorExpression } from "./ast/Expression.ts";
import Func from "./ast/Func.ts";
import Module from "./ast/Module.ts";
import Statement, { ConditionalStatement, LoopStatement, ReturnStatement, VariableAssignmentStatement, VariableDeclarationStatement } from "./ast/Statement.ts";
import Type from "./ast/Type.ts";

type Environment = {
  parent?: Environment,
  variablesAndParameters: Map<string, Type>,
};

export function validate(module: Module): void {
  const globalEnvironment: Environment = createEmptyEnvironment();
  const funcs = new Map<string, Func>();

  for (const func of module.funcs) {
    funcs.set(func.name, func);
  }

  for (const func of module.funcs) {
    validateFunc(func, globalEnvironment, funcs);
  }
}

export function validateFunc(
  func: Func,
  globalEnvironment: Environment,
  funcs: Map<string, Func>,
): void {
  const functionEnvironment: Environment = createEmptyEnvironment(globalEnvironment);

  for (const arg of func.args) {
    if (functionEnvironment.variablesAndParameters.has(arg.name)) {
      throw new Error(`Redefinition of parameter ${arg.name}`);
    }

    if (arg.type === 'void') {
      throw new Error(`Parameter cannot be void: ${arg.name}`);
    }

    functionEnvironment.variablesAndParameters.set(arg.name, arg.type);
  }

  let returnStatementEncountered = false;
  for (const statement of func.statements) {
    if (returnStatementEncountered) {
      throw new Error(`Unreachable statement`);
    }

    validateStatement(statement, func, functionEnvironment, funcs);

    if (statement.type === 'return') {
      returnStatementEncountered = true;
    }
  }

  if (!returnStatementEncountered && func.type !== 'void') {
    throw new Error(`Function has to return a value`);
  }
}

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

  // From now on, the variable type just changes
  // This change will only affect the current scope
  environment.variablesAndParameters.set(statement.variableIdentifier, statement.variableType);
}

export function validateVariableAssignment(
  statement: VariableAssignmentStatement,
  environment: Environment,
  funcs: Map<string, Func>,
): void {
  const variableLookupResult: Type | null = lookupVariableOrParameter(
    statement.variableIdentifier,
    environment,
  );

  if (variableLookupResult === null) {
    throw new Error(`Trying to assign a value to an unknown variable ${statement.variableIdentifier}`);
  }

  const variableType: Type = variableLookupResult;

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

export type ExpressionValidationResult = {
  resultType: Type,
};

export function validateExpression(
  expression: Expression,
  environment: Environment,
  funcs: Map<string, Func>,
): ExpressionValidationResult {
  switch (expression.type) {
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
  if (expression.subtype === 'integer') {
    return { resultType: 'i32' };
  } else {
    return { resultType: 'f32' };
  }
}

export function validateIdentifierExpression(
  expression: IdentifierExpression,
  environment: Environment,
): ExpressionValidationResult {
  const lookupResult: Type | null = lookupVariableOrParameter(expression.identifier, environment);
  if (lookupResult === null) {
    throw new Error(`Unknown identifier: ${expression.identifier}`);
  }

  return {
    resultType: lookupResult,
  };
}

export function validateFunctionCallException(
  expression: FunctionCallExpression,
  environment: Environment,
  funcs: Map<string, Func>,
): ExpressionValidationResult {
  if (!funcs.has(expression.functionIdentifier)) {
    throw new Error(`Unknown function: ${expression.functionIdentifier}`);
  }

  const func: Func = funcs.get(expression.functionIdentifier) as Func;

  if (func.args.length !== expression.argumentValues.length) {
    throw new Error(`Function ${func.name} expects exactly ${func.args.length} arguments. Provided ${expression.argumentValues.length}`);
  }

  for (let i = 0; i < expression.argumentValues.length; i += 1) {
    const argumentValue: Expression = expression.argumentValues[i];
    const argumentValueValidationResult: ExpressionValidationResult = validateExpression(
      argumentValue,
      environment,
      funcs,
    );

    const argumentDescriptor: Argument = func.args[i];

    if (argumentValueValidationResult.resultType !== argumentDescriptor.type) {
      throw new Error(`Expected argument of type ${argumentDescriptor.type}, received ${argumentValueValidationResult.resultType}`);
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
    throw new Error(`Cannot apply operator ${expression.operator} to different types: ${leftPartValidationResult.resultType} and ${rightPartValidationResult.resultType}`);
  }

  return leftPartValidationResult;
}

function createEmptyEnvironment(parent?: Environment): Environment {
  return {
    parent,
    variablesAndParameters: new Map<string, Type>(),
  };
}

function lookupVariableOrParameter(name: string, environment: Environment): Type | null {
  while (true) {
    if (environment.variablesAndParameters.has(name)) {
      return environment.variablesAndParameters.get(name) as Type;
    }

    if (environment.parent === undefined) {
      return null;
    }

    environment = environment.parent;
  }
}
